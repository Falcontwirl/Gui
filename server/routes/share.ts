import { Hono } from 'hono';
import { supabase } from '../db/supabase.js';

const app = new Hono();

// Shareable view: returns the project id by id (placeholder for future slug system).
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .single();
  if (!project) return c.json({ error: 'Not found' }, 404);
  return c.json({ redirect: true, projectId: project.id, name: project.name });
});

export default app;
