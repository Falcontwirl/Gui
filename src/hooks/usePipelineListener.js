import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import useStore from '../store/useStore';
import { API_BASE } from '../lib/api';

const STALE_WARNING_MS = 3 * 60 * 1000; // 3 minutes
const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Shared hook that listens to pipeline SSE progress and navigates on completion.
 * Call `startListening(projectId)` after kicking off an analysis.
 */
export function usePipelineListener() {
  const navigate = useNavigate();
  const setProcessingStatus = useStore(s => s.setProcessingStatus);

  const startListening = useCallback((projectId, retryCount = 0) => {
    const maxRetries = 10;
    const es = new EventSource(`${API_BASE}/api/pipeline/${projectId}/stream`);
    useStore.getState().setSseCleanup(() => { es.close(); clearInterval(staleCheckId); });

    let lastProgressChange = Date.now();
    let lastStatusStr = '';
    let staleWarningShown = false;

    // Periodically check for stale progress
    const staleCheckId = setInterval(() => {
      const elapsed = Date.now() - lastProgressChange;
      if (elapsed > STALE_TIMEOUT_MS) {
        clearInterval(staleCheckId);
        es.close();
        setProcessingStatus('Pipeline timed out — please try again.');
        useStore.getState().setProcessingError({ message: 'Pipeline appears to have stalled. Please try again.' });
      } else if (elapsed > STALE_WARNING_MS && !staleWarningShown) {
        staleWarningShown = true;
        setProcessingStatus('Processing is taking longer than expected...');
      }
    }, 10_000);

    es.addEventListener('progress', (e) => {
      const { status, progress } = JSON.parse(e.data);

      // Track progress changes for staleness detection
      const statusStr = JSON.stringify({ status, progress });
      if (statusStr !== lastStatusStr) {
        lastProgressChange = Date.now();
        lastStatusStr = statusStr;
        staleWarningShown = false;
      }

      useStore.getState().setPipelineStatus(status);
      useStore.getState().setPipelineProgress(progress);
      if (progress?.message) setProcessingStatus(progress.message);

      if (status === 'complete') {
        clearInterval(staleCheckId);
        localStorage.removeItem('gui_active_project');
        localStorage.setItem('gui_active_project', projectId);
        es.close();
        // Let the progress ring animate to 100% before navigating
        setTimeout(() => navigate(`/explore/${projectId}`, { replace: true }), 800);
      }

      if (status === 'failed') {
        clearInterval(staleCheckId);
        localStorage.removeItem('gui_active_project');
        const msg = progress?.message || 'Pipeline failed. Please try again.';
        setProcessingStatus(msg);
        useStore.getState().setProcessingError({ message: msg });
        es.close();
      }

      if (status === 'cancelled') {
        clearInterval(staleCheckId);
        localStorage.removeItem('gui_active_project');
        es.close();
      }
    });

    es.onerror = () => {
      es.close();
      clearInterval(staleCheckId);
      if (retryCount < maxRetries) {
        const delay = Math.min(2000 * Math.pow(1.5, retryCount), 15000);
        setProcessingStatus('Connection lost, reconnecting...');
        setTimeout(() => startListening(projectId, retryCount + 1), delay);
      } else {
        localStorage.setItem('gui_active_project', projectId);
        navigate(`/explore/${projectId}`, { replace: true });
      }
    };
  }, [navigate, setProcessingStatus]);

  return { startListening };
}
