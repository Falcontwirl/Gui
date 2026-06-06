// Vercel serverless function entrypoint.
// Mirrors server/index.ts but exports a Web Standard fetch handler instead of
// starting a Node listener. Routed here via vercel.json's /api/(.*) rewrite.
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import pipelineRoutes from '../server/routes/pipeline.js';
import nodeRoutes from '../server/routes/node.js';
import chatRoutes from '../server/routes/chat.js';
import githubRoutes from '../server/routes/github.js';
import shareRoutes from '../server/routes/share.js';
import adminRoutes from '../server/routes/admin.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

const app = new Hono();

app.use('*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/api/health', (c) => c.json({ status: 'ok' }));
app.route('/api/pipeline', pipelineRoutes);
app.route('/api/node', nodeRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/github', githubRoutes);
app.route('/api/share', shareRoutes);
app.route('/api/admin', adminRoutes);

export default app.fetch;
