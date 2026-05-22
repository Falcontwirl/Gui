import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { supabase } from '../db/supabase.js';
import { deleteProjectFiles, recoverFileContents } from '../db/fileStorage.js';
import { runPipeline } from '../pipeline/orchestrator.js';

const app = new Hono();

const TERMINAL_STATUSES = new Set(['complete', 'failed', 'cancelled']);

app.get('/projects', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'Missing userId' }, 400);

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, framework, language, file_count, summary, created_at, pipeline_status')
    .eq('user_id', userId)
    .eq('pipeline_status', 'complete')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data ?? []);
});

app.delete('/projects/:id', async (c) => {
  const projectId = c.req.param('id');
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'Missing userId' }, 400);

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single();

  if (!project || (project as any).user_id !== userId) {
    return c.json({ error: 'Not found or not authorized' }, 404);
  }

  await supabase.from('chat_messages').delete().eq('project_id', projectId);
  await supabase.from('user_state').delete().eq('project_id', projectId);
  await supabase.from('tree_nodes').delete().eq('project_id', projectId);
  await supabase.from('projects').delete().eq('id', projectId);
  await deleteProjectFiles(projectId).catch((err) => console.error('Storage cleanup failed:', err));

  return c.json({ success: true });
});

app.post('/start', async (c) => {
  const body = await c.req.json();
  const { fileTree, fileContents, projectName, userId } = body;

  const insertData: Record<string, unknown> = {
    name: projectName || 'Untitled Project',
    pipeline_status: 'pending',
    file_count: Object.keys(fileContents || {}).length,
  };
  if (userId) insertData.user_id = userId;

  const { data: project, error } = await supabase
    .from('projects')
    .insert(insertData)
    .select()
    .single();

  if (error || !project) {
    console.error('Failed to create project:', error);
    return c.json({ error: 'Failed to create project' }, 500);
  }

  runPipeline(project.id, { fileTree, fileContents: fileContents || {} }).catch((err) => {
    console.error('Pipeline failed:', err);
  });

  return c.json({ projectId: project.id, cached: false });
});

app.post('/:id/cancel', async (c) => {
  const projectId = c.req.param('id');
  const { data: project } = await supabase
    .from('projects')
    .select('pipeline_status')
    .eq('id', projectId)
    .single();
  if (!project) return c.json({ error: 'Project not found' }, 404);
  if (TERMINAL_STATUSES.has((project as any).pipeline_status)) {
    return c.json({ status: (project as any).pipeline_status });
  }
  await supabase
    .from('projects')
    .update({
      pipeline_status: 'cancelled',
      pipeline_progress: { message: 'Cancelled by user' },
    })
    .eq('id', projectId);
  return c.json({ status: 'cancelled' });
});

app.post('/:id/rerun', async (c) => {
  const projectId = c.req.param('id');
  const { data: project } = await supabase
    .from('projects')
    .select('id, pipeline_status')
    .eq('id', projectId)
    .single();

  if (!project) return c.json({ error: 'Project not found' }, 404);

  const fileContents = await recoverFileContents(projectId);
  if (Object.keys(fileContents).length === 0) {
    return c.json({ error: 'No file contents found. Please re-upload.' }, 400);
  }

  await supabase.from('chat_messages').delete().eq('project_id', projectId);
  await supabase.from('user_state').delete().eq('project_id', projectId);
  await supabase.from('tree_nodes').delete().eq('project_id', projectId);
  await supabase
    .from('projects')
    .update({ pipeline_status: 'pending', pipeline_progress: null })
    .eq('id', projectId);

  runPipeline(projectId, { fileTree: null, fileContents }).catch((err) => {
    console.error('Rerun failed:', err);
  });

  return c.json({ success: true, projectId });
});

app.get('/:id/stream', async (c) => {
  const projectId = c.req.param('id');
  const STALE_MS = 5 * 60 * 1000;

  return streamSSE(c, async (stream) => {
    let lastStatus: string | null = null;
    for (let tick = 0; tick < 600; tick++) {
      const { data: row } = await supabase
        .from('projects')
        .select('pipeline_status, pipeline_progress, created_at')
        .eq('id', projectId)
        .single();
      if (!row) {
        await stream.writeSSE({ event: 'error', data: JSON.stringify({ error: 'Project not found' }) });
        return;
      }

      const status = (row as any).pipeline_status;
      const progress = (row as any).pipeline_progress ?? {};
      if (status !== lastStatus || progress.updated_at) {
        await stream.writeSSE({
          event: 'progress',
          data: JSON.stringify({ status, ...progress }),
        });
        lastStatus = status;
      }

      if (TERMINAL_STATUSES.has(status)) return;

      // Stale-process detector.
      const age = Date.now() - new Date((row as any).created_at).getTime();
      if (status === 'pending' && age > STALE_MS) {
        await supabase
          .from('projects')
          .update({
            pipeline_status: 'failed',
            pipeline_progress: { error: 'Pipeline never started — server may have restarted.' },
          })
          .eq('id', projectId);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }
  });
});

app.get('/:id/status', async (c) => {
  const projectId = c.req.param('id');
  const { data } = await supabase
    .from('projects')
    .select('id, name, pipeline_status, pipeline_progress, framework, language, file_count')
    .eq('id', projectId)
    .single();
  if (!data) return c.json({ error: 'Project not found' }, 404);
  return c.json(data);
});

app.get('/:id/file-content', async (c) => {
  const projectId = c.req.param('id');
  const path = c.req.query('path');
  if (!path) return c.json({ error: 'Missing path' }, 400);
  const { downloadFileContent } = await import('../db/fileStorage.js');
  const content = await downloadFileContent(projectId, path);
  if (content === null) return c.json({ error: 'File not found' }, 404);
  return c.json({ content });
});

export default app;
