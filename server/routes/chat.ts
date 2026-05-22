import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { supabase } from '../db/supabase.js';
import { streamClaude } from '../ai/claude.js';
import { downloadFileContent } from '../db/fileStorage.js';

const app = new Hono();

const MAX_FILE_CONTEXT_CHARS = 12_000;

interface SelectedNode {
  id?: string;
  name?: string;
  path?: string;
  kind?: 'folder' | 'file' | 'function_group';
}

async function buildNodeContext(projectId: string, selected: SelectedNode | undefined): Promise<string> {
  if (!selected?.id) return '';

  // Skip virtual block ids — fall back to the parent file context.
  const realId = selected.id.split('::block_')[0];

  const { data: node } = await supabase
    .from('tree_nodes')
    .select('id, kind, name, path, zone1_description, brief_summary, raw_functions')
    .eq('id', realId)
    .eq('project_id', projectId)
    .single();

  if (!node) return '';

  const parts: string[] = [
    `Currently viewing: ${node.kind} ${node.path || node.name}`,
  ];
  if ((node as any).brief_summary) parts.push(`Brief: ${(node as any).brief_summary}`);
  if ((node as any).zone1_description) parts.push(`Description:\n${(node as any).zone1_description}`);

  if (node.kind === 'file') {
    const content = await downloadFileContent(projectId, (node as any).path);
    if (content) {
      const clipped = content.length > MAX_FILE_CONTEXT_CHARS
        ? content.slice(0, MAX_FILE_CONTEXT_CHARS) + `\n// … (file truncated, ${content.length - MAX_FILE_CONTEXT_CHARS} more chars)`
        : content;
      parts.push(`File contents:\n\`\`\`\n${clipped}\n\`\`\``);
    }
  }

  return parts.join('\n\n');
}

app.post('/', async (c) => {
  const { message, projectId, selectedNode, history } = await c.req.json();

  let userId: string | null = null;
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { data } = await supabase.auth.getUser(authHeader.slice(7));
      userId = data?.user?.id || null;
    } catch {}
  }

  await supabase.from('chat_messages').insert({
    project_id: projectId,
    role: 'user',
    content: message,
    node_id: selectedNode?.id?.includes('::block_') ? null : (selectedNode?.id ?? null),
    context: { selected_node: selectedNode ?? null },
  });

  const { data: project } = await supabase
    .from('projects')
    .select('summary, name, framework, language')
    .eq('id', projectId)
    .single();

  const nodeContext = await buildNodeContext(projectId, selectedNode);

  const systemPrompt = [
    `You are a guide helping someone understand the codebase "${project?.name ?? ''}".`,
    project?.framework ? `Framework: ${project.framework}.` : '',
    project?.language ? `Primary language: ${project.language}.` : '',
    project?.summary ? `\nProject summary:\n${project.summary}` : '',
    nodeContext ? `\nThe user is currently inspecting:\n${nodeContext}` : '',
    `\nRules:
- Reference real files / paths from the context above. Do not invent files.
- Match the user's apparent level — explain plainly, no jargon walls.
- Keep responses under 200 words unless they ask for more detail.
- Use markdown: ## headers, **bold**, \`code\`, bullet lists, fenced code blocks with language tags.`,
  ].filter(Boolean).join('\n');

  return streamSSE(c, async (stream) => {
    let fullResponse = '';
    try {
      const chatMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      if (history && Array.isArray(history)) {
        for (const msg of history.slice(-6)) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            chatMessages.push({ role: msg.role, content: msg.content });
          }
        }
      }
      chatMessages.push({ role: 'user', content: message });

      const textStream = await streamClaude({
        system: systemPrompt,
        messages: chatMessages,
        operation: 'chat',
        projectId,
      });

      for await (const text of textStream) {
        fullResponse += text;
        await stream.writeSSE({ data: JSON.stringify({ text }), event: 'text' });
      }

      await supabase.from('chat_messages').insert({
        project_id: projectId,
        role: 'assistant',
        content: fullResponse,
        node_id: selectedNode?.id?.includes('::block_') ? null : (selectedNode?.id ?? null),
        context: { selected_node: selectedNode ?? null },
      });

      await stream.writeSSE({ data: JSON.stringify({ done: true }), event: 'done' });
    } catch (err: any) {
      await stream.writeSSE({ data: JSON.stringify({ error: err.message }), event: 'error' });
    }
  });
});

app.get('/:projectId/history', async (c) => {
  const projectId = c.req.param('projectId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const { data } = await supabase
    .from('chat_messages')
    .select('id, role, content, node_id, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return c.json({ messages: data ?? [] });
});

export default app;
