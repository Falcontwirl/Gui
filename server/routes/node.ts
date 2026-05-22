import { Hono } from 'hono';
import { supabase } from '../db/supabase.js';
import { callClaudeStructured } from '../ai/claude.js';
import {
  folderDescribeSchema,
  fileDescribeSchema,
  functionGroupSchema,
  jumpResolutionSchema,
} from '../ai/schemas.js';

const app = new Hono();

interface TreeRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  kind: 'folder' | 'file';
  path: string;
  name: string;
  depth: number;
  child_count: number;
  language: string | null;
  byte_size: number | null;
  raw_functions: RawFunction[] | null;
  function_blocks: Block[] | null;
  function_block_details: Record<string, BlockDetail> | null;
  external_imports: string[] | null;
  brief_summary: string | null;
  zone1_description: string | null;
  importance: 'core' | 'standard' | 'boilerplate' | null;
  generated_at: string | null;
}

interface RawFunction {
  name: string;
  kind: 'function' | 'method' | 'class';
  start_line: number;
  end_line: number;
  signature: string;
  snippet: string;
}

interface Block {
  name: string;
  one_liner: string;
  function_names: string[];
}

interface BlockDetail {
  zone1: string;
  function_briefs: Array<{ function_name: string; brief: string }>;
}

const VIRTUAL_PREFIX = '::block_';
const inflight: Map<string, Promise<unknown>> = new Map();

function virtualBlockId(fileId: string, blockIdx: number): string {
  return `${fileId}${VIRTUAL_PREFIX}${blockIdx}`;
}

function parseVirtualId(id: string): { fileId: string; blockIdx: number } | null {
  const i = id.indexOf(VIRTUAL_PREFIX);
  if (i === -1) return null;
  const fileId = id.slice(0, i);
  const idx = Number.parseInt(id.slice(i + VIRTUAL_PREFIX.length), 10);
  if (!Number.isFinite(idx) || idx < 0) return null;
  return { fileId, blockIdx: idx };
}

async function fetchNode(id: string): Promise<TreeRow | null> {
  const { data } = await supabase
    .from('tree_nodes')
    .select('*')
    .eq('id', id)
    .single();
  return (data as TreeRow | null) ?? null;
}

async function fetchChildren(parentId: string, projectId: string): Promise<TreeRow[]> {
  const { data } = await supabase
    .from('tree_nodes')
    .select('*')
    .eq('project_id', projectId)
    .eq('parent_id', parentId)
    .order('sort_order', { ascending: true });
  return (data as TreeRow[] | null) ?? [];
}

async function fetchSiblings(node: TreeRow): Promise<string[]> {
  if (!node.parent_id) return [];
  const { data } = await supabase
    .from('tree_nodes')
    .select('name')
    .eq('project_id', node.project_id)
    .eq('parent_id', node.parent_id)
    .neq('id', node.id)
    .limit(20);
  return (data ?? []).map((r: { name: string }) => r.name);
}

async function fetchProject(projectId: string): Promise<{ name: string; summary: string | null; framework: string | null; language: string | null } | null> {
  const { data } = await supabase
    .from('projects')
    .select('name, summary, framework, language')
    .eq('id', projectId)
    .single();
  return data;
}

// --- describers ---

async function describeFolder(node: TreeRow): Promise<{
  zone1: string;
  childRows: TreeRow[];
  childBriefs: Map<string, string>;
  childImportance: Map<string, 'core' | 'standard' | 'boilerplate'>;
}> {
  const children = await fetchChildren(node.id, node.project_id);
  const siblings = await fetchSiblings(node);
  const project = await fetchProject(node.project_id);

  if (children.length === 0) {
    return {
      zone1: 'This folder is empty.',
      childRows: [],
      childBriefs: new Map(),
      childImportance: new Map(),
    };
  }

  const childrenForPrompt = children.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    path: c.path,
    existing_brief: c.brief_summary ?? null,
    existing_importance: c.importance ?? null,
  }));

  const prompt = [
    `Project: ${project?.name ?? 'Unknown'} (${project?.framework ?? ''} / ${project?.language ?? ''})`,
    project?.summary ? `Project summary: ${project.summary}` : '',
    `Folder path: ${node.path || '(root)'}`,
    siblings.length ? `Sibling folders/files at this level: ${siblings.join(', ')}` : '',
    '',
    'Children of this folder (assign each a brief_summary, using their existing_brief verbatim if not null):',
    JSON.stringify(childrenForPrompt, null, 2),
    '',
    `Importance rating for each child (required: "core" | "standard" | "boilerplate"):
- "core" = this item carries the project's distinctive logic — the work that makes this project itself rather than a generic template. Files implementing the actual features. Be selective; most projects have only a small minority of truly core files.
- "standard" = supporting code that's necessary but not novel — utility helpers, type definitions, common UI primitives, conventional structure.
- "boilerplate" = config, scaffolding, conventions you'd find in any project of this type — package.json, eslint/tsconfig/prettier configs, .gitignore, LICENSE, README, build configs, generated/dist files, .github workflows.
- If existing_importance is non-null, you may keep it verbatim; otherwise assign one.
- Default to "standard" when unsure. Don't inflate "core" — it should feel earned.`,
    '',
    `Sibling-typing rules for brief_summary:
- First, decide what role each child plays. Group children that share a role: "same concept / data type / abstraction" (e.g. all are game characters, all are React components, all are HTTP route handlers, all are migration files).
- WHEN two or more children share a role, lead their brief_summary with the same role name so the parallel is obvious at a glance. Example: "Character implementation — Mario, the jumping plumber." / "Character implementation — Luigi, the cautious sidekick." Or: "Route handler — POST /login, validates credentials and issues a session token." / "Route handler — POST /logout, clears the session and redirects."
- WHEN a child is a container of its siblings (e.g. an "index" file that re-exports the rest, a "types" file consumed by them all), say so explicitly: "Container of the implementations below" or "Shared types consumed by ...".
- WHEN children are sequential stages of one pipeline rather than parallel siblings, label them with their stage: "Stage 1 — …", "Stage 2 — …".
- WHEN children genuinely have unrelated roles (typical for project root: README, package.json, src/, …), don't force a shared label.
- Keep each brief_summary to ≤ 25 words, single sentence.`,
    '',
    'Then write a Zone 1 description for this folder per the schema.',
  ].filter(Boolean).join('\n');

  const result = await callClaudeStructured<{
    zone1: string;
    children: Array<{
      id: string;
      brief_summary: string;
      importance: 'core' | 'standard' | 'boilerplate';
    }>;
  }>({
    system: 'You explain a folder of code to a curious non-expert reader. Focus on what binds the contents together, how the folder relates to its siblings, and how it fits into the wider project. When children share a role, surface that parallel so the reader can compare them at a glance. Avoid jargon. No emojis.',
    prompt,
    schema: folderDescribeSchema as unknown as Record<string, unknown>,
    schemaName: 'folder_describe',
    operation: 'folder_describe',
    projectId: node.project_id,
  });

  const briefs = new Map<string, string>();
  const importances = new Map<string, 'core' | 'standard' | 'boilerplate'>();
  for (const c of result.children) {
    briefs.set(c.id, c.brief_summary);
    if (c.importance) importances.set(c.id, c.importance);
  }
  return { zone1: result.zone1, childRows: children, childBriefs: briefs, childImportance: importances };
}

async function describeFile(node: TreeRow): Promise<{ zone1: string; blocks: Block[] }> {
  const project = await fetchProject(node.project_id);
  const siblings = await fetchSiblings(node);
  const funcs = node.raw_functions ?? [];
  const imports = node.external_imports ?? [];

  if (funcs.length === 0) {
    return {
      zone1: `This file (\`${node.path}\`) does not contain any functions, classes, or methods we could extract. It may be configuration, data, markup, or written in a language we do not yet parse.`,
      blocks: [],
    };
  }

  const funcsForPrompt = funcs.map((f) => ({
    name: f.name,
    kind: f.kind,
    lines: `${f.start_line}-${f.end_line}`,
    signature: f.signature,
    snippet: f.snippet,
  }));

  const prompt = [
    `Project: ${project?.name ?? 'Unknown'} (${project?.framework ?? ''} / ${project?.language ?? ''})`,
    project?.summary ? `Project summary: ${project.summary}` : '',
    `File path: ${node.path}`,
    siblings.length ? `Siblings: ${siblings.join(', ')}` : '',
    imports.length
      ? `External libraries imported by this file: ${imports.join(', ')}`
      : 'External libraries imported by this file: (none detected)',
    '',
    'Functions/classes/methods in this file:',
    JSON.stringify(funcsForPrompt, null, 2),
    '',
    `Dependency-callout rules for zone1:
- If the file imports notable third-party libraries (e.g. React, Express, lodash, the Anthropic SDK), include a sentence early in the description that tells the reader what background knowledge helps. Phrasing examples: "To understand this file you'll want a working idea of **react**." / "Builds on top of **express** and **zod**."
- Wrap every library name in markdown double-asterisks exactly as it appears in the import list above (case-sensitive). Example: **react**, **@anthropic-ai/sdk**, **lodash**.
- Only call out libraries from the import list above. Do not invent dependencies.
- If the import list is empty or only contains language-builtin-feeling names, skip the dependency callout entirely.`,
    '',
    'Group these into logical blocks under shared themes (commonly 1–5 blocks total). Every function_name in your blocks must exist in the list above.',
    'Write a Zone 1 description for the file per the schema.',
  ].filter(Boolean).join('\n');

  const result = await callClaudeStructured<{ zone1: string; blocks: Block[] }>({
    system: 'You explain a single source file to a curious non-expert reader. Focus on the file\'s purpose, how its functions cooperate, and how the file fits into the wider project pipeline. When external libraries are relevant to understanding the file, name them explicitly and wrap each in **markdown bold** so the UI can highlight them as dependencies. Avoid jargon. No emojis.',
    prompt,
    schema: fileDescribeSchema as unknown as Record<string, unknown>,
    schemaName: 'file_describe',
    operation: 'file_describe',
    projectId: node.project_id,
  });

  return { zone1: result.zone1, blocks: result.blocks };
}

async function describeBlock(file: TreeRow, blockIdx: number): Promise<BlockDetail> {
  if (!file.function_blocks || !file.function_blocks[blockIdx]) {
    throw new Error('Block not found');
  }
  const block = file.function_blocks[blockIdx];
  const project = await fetchProject(file.project_id);
  const funcs = (file.raw_functions ?? []).filter((f) => block.function_names.includes(f.name));

  const prompt = [
    `Project: ${project?.name ?? 'Unknown'}`,
    `File: ${file.path}`,
    `Block: ${block.name} — ${block.one_liner}`,
    '',
    'Functions in this block:',
    JSON.stringify(
      funcs.map((f) => ({
        name: f.name,
        kind: f.kind,
        signature: f.signature,
        snippet: f.snippet,
      })),
      null,
      2,
    ),
    '',
    'Write a Zone 1 description for this block per the schema. Provide a brief for each function.',
  ].join('\n');

  return callClaudeStructured<BlockDetail>({
    system: 'You explain a small cohesive group of related functions. Cover what they collectively do, how they call each other, and the role they play within the parent file. Avoid jargon. No emojis.',
    prompt,
    schema: functionGroupSchema as unknown as Record<string, unknown>,
    schemaName: 'function_group',
    operation: 'function_group',
    projectId: file.project_id,
  });
}

// --- response builders ---

function folderResponse(node: TreeRow, childRows: TreeRow[]) {
  return {
    node: {
      id: node.id,
      name: node.name,
      path: node.path,
      kind: 'folder' as const,
      zone1: node.zone1_description ?? '',
    },
    children: childRows.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      brief_summary: c.brief_summary ?? '',
      importance: c.importance ?? null,
    })),
  };
}

function fileResponse(node: TreeRow) {
  const blocks = node.function_blocks ?? [];
  return {
    node: {
      id: node.id,
      name: node.name,
      path: node.path,
      kind: 'file' as const,
      zone1: node.zone1_description ?? '',
    },
    children: blocks.map((b, idx) => ({
      id: virtualBlockId(node.id, idx),
      name: b.name,
      kind: 'function_group' as const,
      brief_summary: b.one_liner,
    })),
  };
}

function blockResponse(file: TreeRow, blockIdx: number) {
  const block = file.function_blocks![blockIdx];
  const detail = file.function_block_details?.[String(blockIdx)];
  const funcs = (file.raw_functions ?? []).filter((f) => block.function_names.includes(f.name));
  const briefMap = new Map(detail?.function_briefs.map((b) => [b.function_name, b.brief]) ?? []);
  return {
    node: {
      id: virtualBlockId(file.id, blockIdx),
      name: block.name,
      path: `${file.path} » ${block.name}`,
      kind: 'function_group' as const,
      zone1: detail?.zone1 ?? '',
    },
    children: funcs.map((f) => ({
      id: `${virtualBlockId(file.id, blockIdx)}::fn_${f.name}`,
      name: f.name,
      kind: 'function' as const,
      brief_summary: briefMap.get(f.name) ?? f.signature,
    })),
  };
}

// --- routes ---

app.post('/project/:projectId/jump', async (c) => {
  const projectId = c.req.param('projectId');
  const { query } = await c.req.json();
  if (!query || typeof query !== 'string' || !query.trim()) {
    return c.json({ error: 'Missing query' }, 400);
  }

  const { data: rows } = await supabase
    .from('tree_nodes')
    .select('id, parent_id, kind, path, name, brief_summary, depth')
    .eq('project_id', projectId)
    .order('depth', { ascending: true })
    .limit(2000);

  if (!rows || rows.length === 0) {
    return c.json({ error: 'Project has no tree' }, 404);
  }

  // Candidate trimming: if huge, prefilter by token overlap on name/path before sending to Claude.
  const lc = query.toLowerCase();
  const tokens = lc.split(/[\s/_\-.]+/).filter(Boolean);
  type Row = typeof rows[number];
  let candidates: Row[] = rows;
  const SOFT_LIMIT = 250;
  if (rows.length > SOFT_LIMIT) {
    const scored = rows.map((r) => {
      const hay = (r.path + ' ' + r.name + ' ' + (r.brief_summary ?? '')).toLowerCase();
      let score = 0;
      for (const t of tokens) if (hay.includes(t)) score += 1;
      return { row: r, score };
    });
    scored.sort((a, b) => b.score - a.score);
    candidates = scored.slice(0, SOFT_LIMIT).map((s) => s.row);
  }

  const compact = candidates.map((r) => ({
    id: r.id,
    kind: r.kind,
    path: r.path || '(root)',
    name: r.name,
    brief: r.brief_summary ?? null,
  }));

  const prompt = [
    `User query: ${query}`,
    '',
    `Candidate nodes from project (${compact.length}):`,
    JSON.stringify(compact),
    '',
    'Return the single best-matching node id. Prefer files over their parent folders when the query is specific. Match on intent, not just keywords — use the brief_summary fields. If nothing matches, return the closest folder.',
  ].join('\n');

  let result: { target_id: string; confidence: string; reasoning: string };
  try {
    result = await callClaudeStructured({
      system: 'You match a user query to the single best tree node id in a code project. Reply via the structured schema only.',
      prompt,
      schema: jumpResolutionSchema as unknown as Record<string, unknown>,
      schemaName: 'jump_resolution',
      operation: 'jump_resolution',
      model: 'fast',
      projectId,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }

  const byId = new Map<string, Row>(rows.map((r) => [r.id, r]));
  const target = byId.get(result.target_id);
  if (!target) {
    return c.json({ error: 'Resolver returned an unknown id', reasoning: result.reasoning }, 404);
  }

  const path: string[] = [];
  let cur: Row | undefined = target;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur.id);
    if (!cur.parent_id) break;
    cur = byId.get(cur.parent_id);
  }

  return c.json({
    targetId: target.id,
    path,
    reasoning: result.reasoning,
    confidence: result.confidence,
    target: { id: target.id, name: target.name, path: target.path || '(root)', kind: target.kind },
  });
});

app.get('/project/:projectId/root', async (c) => {
  const projectId = c.req.param('projectId');
  const { data } = await supabase
    .from('tree_nodes')
    .select('id')
    .eq('project_id', projectId)
    .is('parent_id', null)
    .single();
  if (!data) return c.json({ error: 'Project root not found' }, 404);
  return c.json({ rootId: data.id });
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const virtual = parseVirtualId(id);

  if (virtual) {
    const file = await fetchNode(virtual.fileId);
    if (!file || file.kind !== 'file') return c.json({ error: 'Block parent not found' }, 404);
    if (!file.function_blocks || !file.function_blocks[virtual.blockIdx]) {
      return c.json({ error: 'Block not found' }, 404);
    }
    return c.json(blockResponse(file, virtual.blockIdx));
  }

  const node = await fetchNode(id);
  if (!node) return c.json({ error: 'Node not found' }, 404);
  if (node.kind === 'folder') {
    const children = await fetchChildren(node.id, node.project_id);
    return c.json(folderResponse(node, children));
  }
  return c.json(fileResponse(node));
});

app.post('/:id/describe', async (c) => {
  const id = c.req.param('id');
  const force = c.req.query('force') === 'true';

  const cacheKey = `describe:${id}`;
  if (inflight.has(cacheKey)) {
    const result = await inflight.get(cacheKey)!;
    return c.json(result);
  }

  const work = (async () => {
    const virtual = parseVirtualId(id);

    if (virtual) {
      const file = await fetchNode(virtual.fileId);
      if (!file || file.kind !== 'file') throw new Error('Block parent not found');
      if (!file.function_blocks || !file.function_blocks[virtual.blockIdx]) {
        throw new Error('Block not found');
      }

      const existing = file.function_block_details?.[String(virtual.blockIdx)];
      if (existing && !force) {
        return blockResponse(file, virtual.blockIdx);
      }

      const detail = await describeBlock(file, virtual.blockIdx);
      const next = { ...(file.function_block_details ?? {}), [String(virtual.blockIdx)]: detail };
      await supabase
        .from('tree_nodes')
        .update({ function_block_details: next })
        .eq('id', file.id);
      const refreshed = await fetchNode(file.id);
      return blockResponse(refreshed!, virtual.blockIdx);
    }

    const node = await fetchNode(id);
    if (!node) throw new Error('Node not found');

    if (node.zone1_description && !force) {
      if (node.kind === 'folder') {
        const children = await fetchChildren(node.id, node.project_id);
        return folderResponse(node, children);
      }
      return fileResponse(node);
    }

    if (node.kind === 'folder') {
      const { zone1, childRows, childBriefs, childImportance } = await describeFolder(node);
      const now = new Date().toISOString();

      // Persist children's brief_summary + importance (fill nulls or force).
      for (const child of childRows) {
        const newBrief = childBriefs.get(child.id);
        const newImportance = childImportance.get(child.id);
        const update: Record<string, unknown> = {};
        if (newBrief && (!child.brief_summary || force)) update.brief_summary = newBrief;
        if (newImportance && (!child.importance || force)) update.importance = newImportance;
        if (Object.keys(update).length === 0) continue;
        await supabase
          .from('tree_nodes')
          .update(update)
          .eq('id', child.id);
      }

      await supabase
        .from('tree_nodes')
        .update({ zone1_description: zone1, generated_at: now })
        .eq('id', node.id);

      const refreshedChildren = await fetchChildren(node.id, node.project_id);
      const refreshedNode = await fetchNode(node.id);
      return folderResponse(refreshedNode!, refreshedChildren);
    }

    // File branch.
    const { zone1, blocks } = await describeFile(node);
    const now = new Date().toISOString();
    await supabase
      .from('tree_nodes')
      .update({
        zone1_description: zone1,
        function_blocks: blocks,
        generated_at: now,
      })
      .eq('id', node.id);
    const refreshed = await fetchNode(node.id);
    return fileResponse(refreshed!);
  })();

  inflight.set(cacheKey, work);
  try {
    const result = await work;
    return c.json(result);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  } finally {
    inflight.delete(cacheKey);
  }
});

export default app;
