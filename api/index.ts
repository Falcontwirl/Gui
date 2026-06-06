// Vercel serverless function entrypoint.
// Bridges Vercel's Node-style (req, res) handler to Hono's Web Standard
// app.fetch(). Routed here via vercel.json's /api/(.*) rewrite.
import type { IncomingMessage, ServerResponse } from 'node:http';
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

type VercelReq = IncomingMessage & { body?: unknown };

async function readStream(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined;
}

export default async function handler(req: VercelReq, res: ServerResponse): Promise<void> {
  try {
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `${proto}://${host}`);

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) v.forEach(vv => headers.append(k, vv));
      else headers.set(k, v as string);
    }

    const method = req.method || 'GET';
    let body: string | undefined;
    if (!['GET', 'HEAD'].includes(method)) {
      if (req.body !== undefined) {
        // Vercel parsed the body for us — re-serialize so Hono can re-parse.
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        body = await readStream(req);
      }
    }

    const webRes = await app.fetch(new Request(url, { method, headers, body }));

    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => res.setHeader(key, value));

    if (webRes.body) {
      const reader = webRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error('Handler error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal handler error', message: (err as Error).message }));
  }
}
