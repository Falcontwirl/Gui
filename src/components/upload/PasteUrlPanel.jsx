import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePostHog } from '@posthog/react';
import { Link2, ArrowRight, Loader2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { parseGithubUrl, toRepoFullName } from '../../lib/parseGithubUrl';
import { API_BASE } from '../../lib/api';
import { usePipelineListener } from '../../hooks/usePipelineListener';
import { fetchAndLoadProject } from '../../lib/loadProject';

export default function PasteUrlPanel() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = useStore(s => s.user);
  const getGithubToken = useStore(s => s.getGithubToken);
  const setProjectId = useStore(s => s.setProjectId);
  const setProcessingStatus = useStore(s => s.setProcessingStatus);
  const { startListening } = usePipelineListener();
  const posthog = usePostHog();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const parsed = parseGithubUrl(url);
    if (!parsed) {
      setError('Please paste a valid GitHub URL (e.g. github.com/owner/repo)');
      return;
    }

    setLoading(true);
    try {
      const repoFullName = toRepoFullName(parsed);
      posthog.capture('repo_uploaded', { source: 'paste_url' });

      const res = await fetch(`${API_BASE}/api/github/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName,
          ref: parsed.ref,
          accessToken: getGithubToken(),
          userId: user?.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to analyze repo' }));
        setError(err.error || 'Failed to analyze repo');
        setLoading(false);
        return;
      }

      const { projectId, cached } = await res.json();
      setProjectId(projectId);
      localStorage.setItem('gui_active_project', projectId);
      if (cached) {
        const ok = await fetchAndLoadProject(projectId);
        if (ok) navigate(`/explore/${projectId}`, { replace: true });
        else { setError('Failed to load cached project'); setLoading(false); }
      } else {
        setProcessingStatus(`Analyzing ${repoFullName}...`);
        navigate('/processing', { replace: true });
        startListening(projectId);
      }
    } catch (err) {
      console.error('GitHub analyze failed:', err);
      setError('Failed to analyze repo: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: 10,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-elevated)',
        border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border-visible)'}`,
        boxShadow: 'var(--shadow-xs)',
        transition: `border-color var(--duration-base) var(--ease-out)`,
      }}>
        <Link2 size={16} strokeWidth={1.75} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, marginLeft: 6 }} />
        <input
          type="text" value={url}
          onChange={e => { setUrl(e.target.value); setError(''); }}
          placeholder="Paste a GitHub URL (e.g. github.com/owner/repo)"
          disabled={loading}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 14, color: 'var(--color-text-primary)', minWidth: 0, padding: '6px 0',
          }}
        />
        <button
          type="submit"
          disabled={!url.trim() || loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600,
            background: url.trim() && !loading ? 'var(--color-accent)' : 'var(--color-bg-sunken)',
            color: url.trim() && !loading ? 'var(--color-text-inverse)' : 'var(--color-text-tertiary)',
            border: 'none',
            cursor: url.trim() && !loading ? 'pointer' : 'default',
            transition: `all var(--duration-base) var(--ease-out)`,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={13} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
              Checking...
            </>
          ) : (
            <>
              Analyze
              <ArrowRight size={13} strokeWidth={2} />
            </>
          )}
        </button>
      </div>
      {error && (
        <p style={{ fontSize: 12, color: 'var(--color-error)', marginLeft: 10 }}>{error}</p>
      )}
      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 10 }}>
        Works with any public repo. Private repos require GitHub sign-in.
      </p>
    </form>
  );
}
