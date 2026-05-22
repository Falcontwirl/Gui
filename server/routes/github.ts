import { Hono } from 'hono';
import { supabase } from '../db/supabase.js';
import { runPipeline } from '../pipeline/orchestrator.js';
import JSZip from 'jszip';

const app = new Hono();

// Text-based file extensions to include in analysis
const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala',
  '.c', '.cpp', '.h', '.hpp', '.cs',
  '.swift', '.m', '.mm',
  '.vue', '.svelte', '.astro',
  '.html', '.htm', '.css', '.scss', '.less', '.sass',
  '.json', '.yaml', '.yml', '.toml', '.xml',
  '.md', '.mdx', '.txt', '.rst',
  '.sql', '.graphql', '.gql',
  '.sh', '.bash', '.zsh', '.fish',
  '.dockerfile', '.env', '.gitignore',
  '.lua', '.dart', '.ex', '.exs', '.erl', '.hrl',
  '.php', '.pl', '.pm', '.r', '.jl',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  'vendor', '.venv', 'venv', 'target', '.idea', '.vscode',
  'coverage', '.nyc_output', '.cache',
]);

function shouldIncludeFile(path: string): boolean {
  // Skip hidden files and known non-source dirs
  const parts = path.split('/');
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) return false;
  }

  const ext = '.' + path.split('.').pop()?.toLowerCase();
  // Include known text extensions, or extensionless files like Dockerfile, Makefile
  const basename = parts[parts.length - 1].toLowerCase();
  if (['dockerfile', 'makefile', 'rakefile', 'gemfile', 'procfile'].includes(basename)) return true;

  return TEXT_EXTENSIONS.has(ext);
}

// POST /api/github/analyze - Download a GitHub repo and start the analysis pipeline
// Supports both authenticated (OAuth token) and anonymous (public repo) requests.
app.post('/analyze', async (c) => {
  const { repoFullName, accessToken, ref, userId } = await c.req.json();

  if (!repoFullName || !/^[^/\s]+\/[^/\s]+$/.test(repoFullName)) {
    return c.json({ error: 'Missing or invalid repoFullName (expected "owner/repo")' }, 400);
  }

  try {
    // Download the repo as a zip from GitHub.
    // Anonymous requests to public repos are allowed (rate-limited to 60/hr/IP).
    const zipUrl = `https://api.github.com/repos/${repoFullName}/zipball/${ref || 'HEAD'}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'codebase-explorer',
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const zipRes = await fetch(zipUrl, { headers, redirect: 'follow' });

    if (!zipRes.ok) {
      const errText = await zipRes.text();
      console.error('GitHub zip download failed:', zipRes.status, errText);
      if (zipRes.status === 404) {
        return c.json({ error: 'Repository not found. If it is private, sign in with GitHub to continue.' }, 404);
      }
      if (zipRes.status === 403) {
        return c.json({ error: 'GitHub rate limit reached. Sign in with GitHub to bypass the anonymous limit.' }, 403);
      }
      return c.json({ error: `Failed to download repo: ${zipRes.status}` }, 502);
    }

    const zipBuffer = await zipRes.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);

    // Extract files - GitHub zip has a top-level directory like "owner-repo-sha/"
    const fileContents: Record<string, string> = {};
    const fileTree: string[] = [];
    let rootPrefix = '';

    // Find the root prefix (first directory entry)
    for (const path of Object.keys(zip.files)) {
      if (zip.files[path].dir && path.split('/').filter(Boolean).length === 1) {
        rootPrefix = path;
        break;
      }
    }

    const entries = Object.entries(zip.files);
    for (const [path, file] of entries) {
      if (file.dir) continue;

      // Strip the root prefix to get a clean relative path
      let relativePath = rootPrefix ? path.replace(rootPrefix, '') : path;
      if (!relativePath) continue;

      if (!shouldIncludeFile(relativePath)) continue;

      try {
        const content = await file.async('string');
        // Skip very large files (>100KB) and binary-looking content
        if (content.length > 100_000) continue;
        if (content.includes('\0')) continue;

        fileContents[relativePath] = content;
        fileTree.push(relativePath);
      } catch {
        // Skip files that can't be read as text
      }
    }

    if (Object.keys(fileContents).length === 0) {
      return c.json({ error: 'No source files found in repository' }, 400);
    }

    const projectName = repoFullName.split('/').pop() || repoFullName;
    const insertData: Record<string, unknown> = {
      name: projectName,
      pipeline_status: 'pending',
      file_count: Object.keys(fileContents).length,
    };
    if (userId) insertData.user_id = userId;

    const { data: project, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create project:', error);
      return c.json({ error: 'Failed to create project' }, 500);
    }

    // Start pipeline in background
    runPipeline(project.id, { fileTree: null, fileContents }).catch((err) => {
      console.error('Pipeline failed:', err);
    });

    return c.json({ projectId: project.id, cached: false });
  } catch (err: any) {
    console.error('GitHub analyze error:', err);
    return c.json({ error: err.message || 'Internal error' }, 500);
  }
});

export default app;
