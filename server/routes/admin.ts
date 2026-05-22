import { Hono } from 'hono';
import { supabase } from '../db/supabase.js';

const app = new Hono();

function endOfDay(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`;
}

app.get('/usage/summary', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');

  let query = supabase.from('api_usage').select('model, input_tokens, output_tokens, cost_usd, operation');
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', endOfDay(to));

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const rows = data || [];
  const totalCost = rows.reduce((s, r) => s + Number(r.cost_usd), 0);
  const totalInputTokens = rows.reduce((s, r) => s + r.input_tokens, 0);
  const totalOutputTokens = rows.reduce((s, r) => s + r.output_tokens, 0);

  const byModel: Record<string, { calls: number; cost: number }> = {};
  const byOperation: Record<string, { calls: number; cost: number }> = {};

  for (const r of rows) {
    const m = byModel[r.model] || (byModel[r.model] = { calls: 0, cost: 0 });
    m.calls++;
    m.cost += Number(r.cost_usd);

    const o = byOperation[r.operation] || (byOperation[r.operation] = { calls: 0, cost: 0 });
    o.calls++;
    o.cost += Number(r.cost_usd);
  }

  return c.json({
    total_cost: totalCost,
    total_calls: rows.length,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    by_model: Object.entries(byModel).map(([model, v]) => ({ model, ...v })),
    by_operation: Object.entries(byOperation)
      .map(([operation, v]) => ({ operation, ...v }))
      .sort((a, b) => b.cost - a.cost),
  });
});

app.get('/usage/by-project', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');
  const sort = c.req.query('sort') || 'cost';
  const order = c.req.query('order') || 'desc';

  let query = supabase.from('api_usage').select('project_id, model, input_tokens, output_tokens, cost_usd');
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', endOfDay(to));

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const rows = data || [];
  const byProject: Record<string, { calls: number; input_tokens: number; output_tokens: number; cost: number }> = {};

  for (const r of rows) {
    const pid = r.project_id || 'unknown';
    const p = byProject[pid] || (byProject[pid] = { calls: 0, input_tokens: 0, output_tokens: 0, cost: 0 });
    p.calls++;
    p.input_tokens += r.input_tokens;
    p.output_tokens += r.output_tokens;
    p.cost += Number(r.cost_usd);
  }

  const projectIds = Object.keys(byProject).filter((id) => id !== 'unknown');
  const { data: projects } = projectIds.length > 0
    ? await supabase.from('projects').select('id, name, framework, language').in('id', projectIds)
    : { data: [] };

  const projectMap = new Map((projects || []).map((p: any) => [p.id, p]));

  let result = Object.entries(byProject).map(([id, stats]) => {
    const proj = projectMap.get(id);
    return {
      project_id: id,
      name: proj?.name || (id === 'unknown' ? 'No Project' : 'Deleted Project'),
      framework: proj?.framework || '',
      language: proj?.language || '',
      ...stats,
    };
  });

  const sortKey = sort === 'name' ? 'name' : sort === 'calls' ? 'calls' : sort === 'input_tokens' ? 'input_tokens' : sort === 'output_tokens' ? 'output_tokens' : 'cost';
  result.sort((a, b) => {
    const av = (a as any)[sortKey];
    const bv = (b as any)[sortKey];
    if (typeof av === 'string') return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return order === 'asc' ? av - bv : bv - av;
  });

  return c.json(result);
});

app.get('/usage/timeline', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');

  let query = supabase.from('api_usage').select('cost_usd, created_at');
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', endOfDay(to));
  query = query.order('created_at', { ascending: true });

  const { data, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const rows = data || [];
  const byDay: Record<string, { cost: number; calls: number }> = {};

  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    const d = byDay[day] || (byDay[day] = { cost: 0, calls: 0 });
    d.cost += Number(r.cost_usd);
    d.calls++;
  }

  return c.json({
    data: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
  });
});

export default app;
