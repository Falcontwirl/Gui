import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { usePostHog } from '@posthog/react';
import { Search, AlertTriangle, Loader2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { API_BASE } from '../../lib/api';
import { usePipelineListener } from '../../hooks/usePipelineListener';
import { fetchAndLoadProject } from '../../lib/loadProject';

// Inline GitHub icon — lucide-react v1.7 doesn't ship one.
const Github = ({ size = 16, strokeWidth = 1.75, color = 'currentColor', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', Ruby: '#701516',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Vue: '#41b883',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Lua: '#000080',
};

export default function GitHubReposPanel() {
  const user = useStore(s => s.user);
  const getGithubToken = useStore(s => s.getGithubToken);
  const setProjectId = useStore(s => s.setProjectId);
  const setProcessingStatus = useStore(s => s.setProcessingStatus);
  const navigate = useNavigate();
  const { startListening } = usePipelineListener();
  const posthog = usePostHog();

  const githubToken = getGithubToken();
  const hasGithub = !!githubToken;

  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [analyzing, setAnalyzing] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [analyzeError, setAnalyzeError] = useState(null); // { repoFullName, message }

  const fetchRepos = useCallback(async (pageNum = 1) => {
    const token = getGithubToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(
        `https://api.github.com/user/repos?sort=updated&per_page=30&page=${pageNum}&type=all`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } },
      );
      if (!res.ok) {
        if (res.status === 401) { setError('GitHub token expired. Please reconnect.'); return; }
        throw new Error(`GitHub API error: ${res.status}`);
      }
      const data = await res.json();
      setHasMore(data.length === 30);
      setRepos(prev => pageNum === 1 ? data : [...prev, ...data]);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [getGithubToken]);

  useEffect(() => { if (hasGithub) fetchRepos(1); else setLoading(false); }, [hasGithub, fetchRepos]);

  const handleAnalyze = async (repo) => {
    const token = getGithubToken();
    if (!token) return;
    setAnalyzing(repo.full_name);
    setAnalyzeError(null);
    posthog.capture('repo_uploaded', { source: 'github_repos' });
    try {
      const res = await fetch(`${API_BASE}/api/github/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: repo.full_name, accessToken: token, userId: user?.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAnalyzeError({ repoFullName: repo.full_name, message: err.error || `Server error: ${res.status}` });
        setAnalyzing(null);
        return;
      }
      const { projectId, cached } = await res.json();
      setProjectId(projectId);
      localStorage.setItem('gui_active_project', projectId);
      if (cached) {
        const ok = await fetchAndLoadProject(projectId);
        if (ok) navigate(`/explore/${projectId}`, { replace: true });
        else { setAnalyzeError({ repoFullName: repo.full_name, message: 'Could not load cached project' }); setAnalyzing(null); }
      } else {
        setProcessingStatus(`Analyzing ${repo.full_name}...`);
        navigate('/processing', { replace: true });
        startListening(projectId);
      }
    } catch (err) {
      setAnalyzeError({ repoFullName: repo.full_name, message: err.message });
      setAnalyzing(null);
    }
  };

  const handleConnect = async () => {
    sessionStorage.setItem('gui_upload_tab', 'repos');
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { scopes: 'repo read:user', redirectTo: window.location.origin + '/upload' },
    });
  };

  const filtered = repos.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase()),
  );

  // Not connected — show CTA
  if (!hasGithub) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, padding: '3rem 1rem', textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-bg-sunken)', border: '1px solid var(--color-border-subtle)',
        }}>
          <Github size={24} strokeWidth={1.5} color="var(--color-text-tertiary)" />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Connect your GitHub account
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', maxWidth: 340 }}>
            Sign in to browse and analyze your public and private repositories.
          </p>
        </div>
        <button
          onClick={handleConnect}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600,
            background: 'var(--color-accent)', color: 'var(--color-text-inverse)',
            border: 'none', cursor: 'pointer',
            transition: `all var(--duration-base) var(--ease-out)`,
          }}
        >
          <Github size={15} strokeWidth={1.75} color="var(--color-text-inverse)" />
          Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-sunken)',
        border: '1px solid var(--color-border-subtle)',
      }}>
        <Search size={14} strokeWidth={1.75} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        <input
          type="text" placeholder="Search repositories..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--color-text-primary)', minWidth: 0,
          }}
        />
      </div>

      {/* Repo list */}
      <div style={{
        maxHeight: 'min(420px, 55dvh)', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 6,
        scrollbarWidth: 'thin', scrollbarColor: 'var(--color-border-visible) transparent',
      }}>
        {loading && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            Loading repositories...
          </p>
        )}
        {error && (
          <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-error)', fontSize: 13 }}>
            {error}
          </p>
        )}
        {!loading && !error && filtered.map(repo => (
          <div key={repo.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
              transition: `border-color var(--duration-fast) var(--ease-out)`,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-visible)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)'; }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {repo.full_name}
                </span>
                {repo.private && (
                  <span style={{
                    fontSize: 10, padding: '1px 5px', borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--color-border-visible)', color: 'var(--color-text-tertiary)',
                  }}>private</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                {repo.language && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                      background: LANGUAGE_COLORS[repo.language] || 'var(--color-text-tertiary)',
                    }} />
                    {repo.language}
                  </span>
                )}
                {repo.stargazers_count > 0 && <span>{repo.stargazers_count} stars</span>}
              </div>
            </div>
            <button
              onClick={() => handleAnalyze(repo)}
              disabled={analyzing === repo.full_name}
              style={{
                marginLeft: 10, padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                fontSize: 12, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: analyzing === repo.full_name ? 'var(--color-bg-sunken)' : 'var(--color-accent)',
                color: analyzing === repo.full_name ? 'var(--color-text-tertiary)' : 'var(--color-text-inverse)',
                border: 'none', cursor: analyzing === repo.full_name ? 'default' : 'pointer',
                whiteSpace: 'nowrap', transition: `all var(--duration-base) var(--ease-out)`,
              }}
            >
              {analyzing === repo.full_name ? (
                <><Loader2 size={12} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Checking...</>
              ) : 'Analyze'}
            </button>
          </div>
          {analyzeError?.repoFullName === repo.full_name && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: 'color-mix(in srgb, var(--color-error) 8%, var(--color-bg-elevated))',
              border: '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)',
            }}>
              <AlertTriangle size={14} strokeWidth={1.75} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: 'var(--color-error)', lineHeight: 1.5, margin: 0 }}>
                {analyzeError.message}
              </p>
            </div>
          )}
          </div>
        ))}

        {!loading && !error && filtered.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            {search ? 'No repositories match your search.' : 'No repositories found.'}
          </p>
        )}

        {hasMore && !search && !loading && (
          <button
            onClick={() => { const n = page + 1; setPage(n); fetchRepos(n); }}
            style={{
              padding: '10px', background: 'none', border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)', color: 'var(--color-text-secondary)',
              cursor: 'pointer', fontSize: 12, marginTop: 4,
              transition: `border-color var(--duration-fast) var(--ease-out)`,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-visible)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-subtle)'; }}
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
