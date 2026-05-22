// Stage 4: per-file analysis using truncated content + batched Claude calls.
// Each batch is a single Claude call covering up to BATCH_SIZE files. Three
// batches run concurrently. Each file's brief_summary + importance lands on
// its tree_nodes row.

import { supabase } from '../db/supabase.js';
import { callClaudeStructured } from '../ai/claude.js';
import { fileAnalysisSchema } from '../ai/schemas.js';
import { updateProgress } from './progress.js';
import { smartTruncate } from './truncation.js';

interface AnalyzableFile {
  id: string;
  path: string;
  content: string;
}

interface FileAnalysis {
  path: string;
  brief_summary: string;
  importance: 'core' | 'standard' | 'boilerplate';
  role: string;
}

const BATCH_SIZE = 30;
const CONCURRENCY = 3;
const TRUNCATE_BUDGET = 3500;

export async function runFileAnalysis(
  projectId: string,
  files: AnalyzableFile[],
  framework: string,
  language: string,
  onProgress?: (batchesDone: number, totalBatches: number, lastFile: string) => void
): Promise<void> {
  if (files.length === 0) return;

  const batches: AnalyzableFile[][] = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE));
  }

  const idByPath = new Map<string, string>();
  for (const f of files) idByPath.set(f.path, f.id);

  let completedBatches = 0;

  async function processBatch(batch: AnalyzableFile[], idx: number): Promise<FileAnalysis[]> {
    const blob = batch
      .map((f) => `<file path="${f.path}">\n${smartTruncate(f.content, TRUNCATE_BUDGET)}\n</file>`)
      .join('\n\n');

    try {
      const result = await callClaudeStructured<{ files: FileAnalysis[] }>({
        system: `You analyze code files for a ${framework} / ${language} project. For each file return a single-sentence brief_summary, an importance rating ("core" for distinctive project logic, "boilerplate" for config/scaffolding/conventional files, "standard" otherwise — be selective with "core"), and a role classification. Be concise. No emojis.`,
        prompt: `Analyze these ${batch.length} files. Return a JSON \`files\` array with one entry per file. Use the exact \`path\` strings provided.\n\n${blob}`,
        schema: fileAnalysisSchema as unknown as Record<string, unknown>,
        schemaName: 'file_analysis',
        maxTokens: Math.min(8192, Math.max(2048, batch.length * 180)),
        model: 'fast',
        operation: 'file_analysis',
        projectId,
      });

      const out = (result.files || []).filter(
        (f): f is FileAnalysis => f != null && typeof f.path === 'string'
      );
      // Defensive: fill in anything the model dropped.
      const seen = new Set(out.map((f) => f.path));
      for (const f of batch) {
        if (!seen.has(f.path)) {
          out.push({
            path: f.path,
            brief_summary: 'Not analyzed.',
            importance: 'standard',
            role: 'utility',
          });
        }
      }
      return out;
    } catch (err) {
      console.error(`[file_analysis] batch ${idx + 1} failed:`, err);
      return batch.map((f) => ({
        path: f.path,
        brief_summary: 'Analysis failed.',
        importance: 'standard' as const,
        role: 'utility',
      }));
    } finally {
      completedBatches += 1;
      const lastFile = batch[batch.length - 1]?.path ?? '';
      onProgress?.(completedBatches, batches.length, lastFile);
      await updateProgress(
        projectId,
        5,
        `Analyzing files (${completedBatches}/${batches.length})…`,
        undefined,
        { batch: completedBatches, totalBatches: batches.length, lastFile }
      );
    }
  }

  // Run waves of CONCURRENCY batches in parallel.
  const allAnalyses: FileAnalysis[] = [];
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const wave = batches.slice(i, i + CONCURRENCY);
    const waveResults = await Promise.all(
      wave.map((batch, offset) => processBatch(batch, i + offset))
    );
    allAnalyses.push(...waveResults.flat());
  }

  // Persist: 50 UPDATEs per wave to avoid storming Supabase's HTTP layer.
  const PERSIST_WAVE = 50;
  for (let i = 0; i < allAnalyses.length; i += PERSIST_WAVE) {
    const wave = allAnalyses.slice(i, i + PERSIST_WAVE);
    await Promise.all(
      wave.map((a) => {
        const id = idByPath.get(a.path);
        if (!id) return Promise.resolve(null);
        return supabase
          .from('tree_nodes')
          .update({
            brief_summary: a.brief_summary,
            importance: a.importance,
          })
          .eq('id', id);
      })
    );
  }
}
