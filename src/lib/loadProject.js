import useStore from '../store/useStore';
import { API_BASE } from './api';

// Lightweight project loader for Gui: confirms the project exists,
// hydrates store metadata, and lets PyramidView fetch nodes on its own.
export async function fetchAndLoadProject(projectId) {
  if (!projectId) return null;
  try {
    const res = await fetch(`${API_BASE}/api/pipeline/${projectId}/status`);
    if (!res.ok) return null;
    const meta = await res.json();
    const store = useStore.getState();
    store.setProjectId(projectId);
    store.setProjectMeta(meta);
    store.setPipelineStatus(meta.pipeline_status);
    return meta;
  } catch (err) {
    console.error('fetchAndLoadProject failed:', err);
    return null;
  }
}
