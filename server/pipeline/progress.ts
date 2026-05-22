import { supabase } from '../db/supabase.js';

export async function updateProgress(
  projectId: string,
  stage: number,
  message: string,
  status?: string,
  extra?: Record<string, unknown>,
) {
  await supabase
    .from('projects')
    .update({
      pipeline_status: status || `stage_${stage}`,
      pipeline_progress: { stage, total_stages: 7, message, updated_at: new Date().toISOString(), ...extra },
    })
    .eq('id', projectId);
}
