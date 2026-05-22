import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { logger } from 'hono/logger';
import { config } from 'dotenv';
config({ quiet: true });

import pipelineRoutes from './routes/pipeline.js';
import nodeRoutes from './routes/node.js';
import chatRoutes from './routes/chat.js';
import githubRoutes from './routes/github.js';
import shareRoutes from './routes/share.js';
import adminRoutes from './routes/admin.js';

const app = new Hono();

app.use('*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', compress());
app.use('*', logger());

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/pipeline', pipelineRoutes);
app.route('/api/node', nodeRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/github', githubRoutes);
app.route('/api/share', shareRoutes);
app.route('/api/admin', adminRoutes);

const port = parseInt(process.env.PORT || '3007');
console.log(`Server starting on port ${port}`);

serve({ fetch: app.fetch, port });
