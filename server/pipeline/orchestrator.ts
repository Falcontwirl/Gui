import { randomUUID } from 'node:crypto';
import { supabase } from '../db/supabase.js';
import { uploadFileContentsBatch } from '../db/fileStorage.js';
import {
  extractFunctions,
  extractImports,
  SUPPORTED_EXTENSIONS,
  type RawFunction,
} from './astExtractor.js';
import { updateProgress } from './progress.js';

export interface PipelineInput {
  fileTree?: Array<{ path: string; name: string; isCode: boolean; size: number }> | null;
  fileContents: Record<string, string>;
}

interface FolderRow {
  project_id: string;
  parent_path: string | null;
  path: string;
  name: string;
  kind: 'folder';
  depth: number;
  byte_size: null;
  language: null;
}

interface FileRow {
  project_id: string;
  parent_path: string;
  path: string;
  name: string;
  kind: 'file';
  depth: number;
  byte_size: number;
  language: string | null;
  raw_functions: RawFunction[];
}

const LANG_BY_EXT: Record<string, string> = {
  js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'JavaScript',
  ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java',
  kt: 'Kotlin', php: 'PHP', cs: 'C#', swift: 'Swift', dart: 'Dart',
  c: 'C', cpp: 'C++', h: 'C', hpp: 'C++',
  json: 'JSON', md: 'Markdown', html: 'HTML', css: 'CSS',
  yml: 'YAML', yaml: 'YAML', toml: 'TOML',
};

function langOf(path: string): string | null {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return LANG_BY_EXT[ext] ?? null;
}

function isAstSupported(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_EXTENSIONS.includes(ext);
}

function parentOf(p: string): string {
  const idx = p.lastIndexOf('/');
  return idx === -1 ? '' : p.slice(0, idx);
}

function discoverFolders(filePaths: string[]): Set<string> {
  const folders = new Set<string>(['']);
  for (const p of filePaths) {
    let cur = parentOf(p);
    while (cur && !folders.has(cur)) {
      folders.add(cur);
      cur = parentOf(cur);
    }
  }
  return folders;
}

function sortKey(name: string, kind: 'folder' | 'file'): string {
  // Folders before files; alphabetical within each.
  return `${kind === 'folder' ? '0' : '1'}${name.toLowerCase()}`;
}

function detectFramework(fileContents: Record<string, string>): string {
  const pkg = fileContents['package.json'];
  const frameworks: string[] = [];
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg);
      const deps = { ...parsed.dependencies, ...parsed.devDependencies };
      if (deps['react']) frameworks.push('React');
      if (deps['next']) frameworks.push('Next.js');
      if (deps['vue']) frameworks.push('Vue');
      if (deps['express']) frameworks.push('Express');
      if (deps['hono']) frameworks.push('Hono');
      if (deps['@angular/core']) frameworks.push('Angular');
      if (deps['svelte']) frameworks.push('Svelte');
    } catch {}
  }
  const paths = Object.keys(fileContents);
  if (paths.some((p) => p.endsWith('requirements.txt'))) frameworks.push('Python');
  if (paths.some((p) => p.endsWith('go.mod'))) frameworks.push('Go');
  if (paths.some((p) => p.endsWith('Cargo.toml'))) frameworks.push('Rust');
  return frameworks.join(' + ') || 'Unknown';
}

function detectLanguage(fileContents: Record<string, string>): string {
  const counts: Record<string, number> = {};
  for (const path of Object.keys(fileContents)) {
    const lang = langOf(path);
    if (lang) counts[lang] = (counts[lang] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? 'Unknown';
}

export async function runFilesystemIngest(
  projectId: string,
  input: PipelineInput
): Promise<void> {
  const start = Date.now();
  await updateProgress(projectId, 0, 'Starting…', 'processing');

  const filePaths = Object.keys(input.fileContents);
  const framework = detectFramework(input.fileContents);
  const language = detectLanguage(input.fileContents);

  await supabase
    .from('projects')
    .update({ framework, language, file_count: filePaths.length })
    .eq('id', projectId);

  if (filePaths.length === 0) {
    await updateProgress(projectId, 6, 'Pipeline complete!', 'complete');
    return;
  }

  // 1. Discover folders + pre-allocate UUIDs for every node so parent_id is known up front.
  await updateProgress(projectId, 1, 'Mapping folders and files…');
  const folderSet = discoverFolders(filePaths);
  const folders = [...folderSet].sort((a, b) => a.split('/').length - b.split('/').length);

  const idByPath: Map<string, string> = new Map();
  for (const folderPath of folders) idByPath.set(folderPath, randomUUID());
  for (const path of filePaths) idByPath.set(path, randomUUID());

  // 2. Compute sort_order + child_count per parent (in memory, no DB round-trips).
  const childrenByParent = new Map<string, Array<{ id: string; name: string; kind: 'folder' | 'file' }>>();
  const addChild = (parentPath: string, child: { id: string; name: string; kind: 'folder' | 'file' }) => {
    if (!childrenByParent.has(parentPath)) childrenByParent.set(parentPath, []);
    childrenByParent.get(parentPath)!.push(child);
  };
  for (const folderPath of folders) {
    if (folderPath === '') continue;
    const name = folderPath.split('/').pop()!;
    addChild(parentOf(folderPath), { id: idByPath.get(folderPath)!, name, kind: 'folder' });
  }
  for (const path of filePaths) {
    const name = path.split('/').pop()!;
    addChild(parentOf(path), { id: idByPath.get(path)!, name, kind: 'file' });
  }

  const sortOrderById = new Map<string, number>();
  const childCountByParentPath = new Map<string, number>();
  for (const [parent, kids] of childrenByParent.entries()) {
    kids.sort((a, b) => sortKey(a.name, a.kind).localeCompare(sortKey(b.name, b.kind)));
    for (let i = 0; i < kids.length; i++) sortOrderById.set(kids[i].id, i);
    childCountByParentPath.set(parent, kids.length);
  }

  // 3. AST + imports in parallel for code files.
  await updateProgress(projectId, 2, `Extracting code structure from ${filePaths.length} files…`);
  const astByPath = new Map<string, { funcs: RawFunction[]; imports: string[] }>();
  const codeFiles = filePaths.filter(isAstSupported);
  const AST_BATCH = 8;
  for (let i = 0; i < codeFiles.length; i += AST_BATCH) {
    const batch = codeFiles.slice(i, i + AST_BATCH);
    await Promise.all(
      batch.map(async (path) => {
        const content = input.fileContents[path];
        try {
          const [funcs, imports] = await Promise.all([
            extractFunctions(path, content),
            extractImports(path, content),
          ]);
          astByPath.set(path, { funcs, imports });
        } catch (err) {
          console.error(`[ingest] AST failed on ${path}:`, err);
        }
      })
    );
  }

  // 4. Build all rows.
  const folderRows = folders.map((folderPath) => {
    const isRoot = folderPath === '';
    const id = idByPath.get(folderPath)!;
    return {
      id,
      project_id: projectId,
      parent_id: isRoot ? null : idByPath.get(parentOf(folderPath)) ?? null,
      kind: 'folder' as const,
      path: folderPath,
      name: isRoot ? '(root)' : folderPath.split('/').pop()!,
      depth: isRoot ? 0 : folderPath.split('/').length,
      sort_order: sortOrderById.get(id) ?? 0,
      child_count: childCountByParentPath.get(folderPath) ?? 0,
    };
  });

  const fileRows = filePaths.map((path) => {
    const id = idByPath.get(path)!;
    const content = input.fileContents[path];
    const ast = astByPath.get(path);
    return {
      id,
      project_id: projectId,
      parent_id: idByPath.get(parentOf(path)) ?? null,
      kind: 'file' as const,
      path,
      name: path.split('/').pop()!,
      depth: path.split('/').length,
      sort_order: sortOrderById.get(id) ?? 0,
      byte_size: content.length,
      language: langOf(path),
      raw_functions: ast?.funcs ?? [],
      external_imports: ast?.imports ?? [],
    };
  });

  // 5. Bulk insert folders depth-first (parent FKs must resolve), then files.
  await updateProgress(projectId, 3, 'Writing tree to database…');
  const foldersByDepth = new Map<number, typeof folderRows>();
  for (const row of folderRows) {
    if (!foldersByDepth.has(row.depth)) foldersByDepth.set(row.depth, []);
    foldersByDepth.get(row.depth)!.push(row);
  }
  const BATCH = 500;
  for (const depth of [...foldersByDepth.keys()].sort((a, b) => a - b)) {
    const rows = foldersByDepth.get(depth)!;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await supabase.from('tree_nodes').insert(rows.slice(i, i + BATCH));
      if (error) throw new Error(`Folder bulk insert failed: ${error.message}`);
    }
  }
  for (let i = 0; i < fileRows.length; i += BATCH) {
    const { error } = await supabase.from('tree_nodes').insert(fileRows.slice(i, i + BATCH));
    if (error) throw new Error(`File bulk insert failed: ${error.message}`);
  }

  // 6. Upload file contents to Storage in parallel.
  await updateProgress(projectId, 4, 'Uploading file contents…');
  await uploadFileContentsBatch(projectId, input.fileContents);

  await updateProgress(projectId, 6, 'Pipeline complete!', 'complete');
  console.log(`[ingest] project ${projectId} done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

export async function runPipeline(projectId: string, input: PipelineInput): Promise<void> {
  try {
    await runFilesystemIngest(projectId, input);
  } catch (err) {
    console.error(`Pipeline failed for project ${projectId}:`, err);
    await supabase
      .from('projects')
      .update({
        pipeline_status: 'failed',
        pipeline_progress: { error: (err as Error).message },
      })
      .eq('id', projectId);
  }
}
