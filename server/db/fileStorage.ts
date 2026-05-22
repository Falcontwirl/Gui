import { supabase } from './supabase.js';

const BUCKET = 'file-contents';

function sanitizeKey(filePath: string): string {
  return filePath.replace(/\[/g, '(').replace(/\]/g, ')').replace(/\.\.\./g, '_rest_');
}

function storagePath(projectId: string, filePath: string): string {
  return `${projectId}/${sanitizeKey(filePath)}`;
}

export async function uploadFileContent(
  projectId: string,
  filePath: string,
  content: string
): Promise<void> {
  const path = storagePath(projectId, filePath);
  const blob = new Blob([content], { type: 'text/plain' });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true });
  if (error) throw new Error(`Storage upload failed for ${path}: ${error.message}`);
}

export async function uploadFileContentsBatch(
  projectId: string,
  fileContents: Record<string, string>
): Promise<void> {
  const entries = Object.entries(fileContents);
  const CONCURRENCY = 20;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(([path, content]) => uploadFileContent(projectId, path, content))
    );
  }
}

export async function downloadFileContent(
  projectId: string,
  filePath: string
): Promise<string | null> {
  const path = storagePath(projectId, filePath);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(path);
  if (error || !data) return null;
  return await data.text();
}

export async function downloadFileContentsBatch(
  projectId: string,
  filePaths: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const CONCURRENCY = 20;
  for (let i = 0; i < filePaths.length; i += CONCURRENCY) {
    const batch = filePaths.slice(i, i + CONCURRENCY);
    const contents = await Promise.all(
      batch.map(async (fp) => {
        const content = await downloadFileContent(projectId, fp);
        return [fp, content] as const;
      })
    );
    for (const [fp, content] of contents) {
      if (content !== null) result[fp] = content;
    }
  }
  return result;
}

function unsanitizeKey(sanitized: string): string {
  return sanitized.replace(/\(/g, '[').replace(/\)/g, ']').replace(/_rest_/g, '...');
}

async function listRecursive(prefix: string): Promise<string[]> {
  const { data } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });
  if (!data || data.length === 0) return [];

  const paths: string[] = [];
  for (const item of data) {
    const fullPath = `${prefix}/${item.name}`;
    if (item.id) {
      paths.push(fullPath);
    } else {
      paths.push(...await listRecursive(fullPath));
    }
  }
  return paths;
}

export async function listProjectStorageFiles(projectId: string): Promise<string[]> {
  const allPaths = await listRecursive(projectId);
  const prefix = `${projectId}/`;
  return allPaths
    .filter(p => p.startsWith(prefix))
    .map(p => unsanitizeKey(p.slice(prefix.length)));
}

export async function recoverFileContents(projectId: string): Promise<Record<string, string>> {
  const { data: fileRows } = await supabase
    .from('tree_nodes')
    .select('path')
    .eq('project_id', projectId)
    .eq('kind', 'file');

  let filePaths: string[];
  if (fileRows && fileRows.length > 0) {
    filePaths = fileRows.map((r: { path: string }) => r.path);
  } else {
    filePaths = await listProjectStorageFiles(projectId);
  }

  if (filePaths.length === 0) return {};
  return downloadFileContentsBatch(projectId, filePaths);
}

export async function deleteProjectFiles(projectId: string): Promise<void> {
  const allPaths = await listRecursive(projectId);
  if (allPaths.length === 0) return;

  const BATCH = 100;
  for (let i = 0; i < allPaths.length; i += BATCH) {
    await supabase.storage.from(BUCKET).remove(allPaths.slice(i, i + BATCH));
  }
}
