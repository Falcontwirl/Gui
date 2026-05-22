import { build } from 'esbuild';

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'server-dist/index.mjs',
  external: [
    '@supabase/supabase-js',
    '@anthropic-ai/sdk',
    'dotenv',
    'web-tree-sitter',
    'tree-sitter-wasms',
  ],
  loader: { '.wasm': 'file' },
  banner: {
    js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
`,
  },
});

console.log('Server built to server-dist/index.mjs');
