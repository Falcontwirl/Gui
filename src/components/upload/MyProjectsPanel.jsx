import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { FolderOpen, Loader2, ArrowRight, Code2, Layers, FileCode2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { fetchAndLoadProject } from '../../lib/loadProject';
import { timeAgo } from '../../lib/formatDate';
import { API_BASE } from '../../lib/api';

const LANG_COLORS = {
  JavaScript: '#f59e0b',
  TypeScript: '#06b6d4',
  Python: '#10b981',
  Java: '#f43f5e',
  Go: '#8b5cf6',
  Rust: '#f97316',
  Ruby: '#f43f5e',
  'C#': '#6366f1',
  PHP: '#8b5cf6',
  Swift: '#f97316',
  Kotlin: '#8b5cf6',
};

function getLangColor(lang) {
  if (!lang) return 'var(--color-text-tertiary)';
  return LANG_COLORS[lang] || 'var(--color-accent)';
}

const CACHE_TTL = 60_000;

export default function MyProjectsPanel() {
  const navigate = useNavigate();
  const user = useStore(s => s.user);
  const cachedProjects = useStore(s => s.cachedProjects);
  const cachedProjectsAt = useStore(s => s.cachedProjectsAt);
  const setCachedProjects = useStore(s => s.setCachedProjects);
  const [projects, setProjects] = useState(cachedProjects || []);
  const [loading, setLoading] = useState(!cachedProjects);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const isFresh = cachedProjects && (Date.now() - cachedProjectsAt < CACHE_TTL);
    if (isFresh) return;

    fetch(`${API_BASE}/api/pipeline/projects?userId=${user.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setProjects(data);
        setCachedProjects(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cachedProjects) setError('Could not load your projects.');
        setLoading(false);
      });
  }, [user?.id]);

  const handleOpen = async (project) => {
    if (loadingId) return;
    setLoadingId(project.id);
    try {
      const result = await fetchAndLoadProject(project.id);
      if (result) {
        navigate(`/explore/${project.id}`, { replace: true });
      } else {
        setLoadingId(null);
      }
    } catch {
      setLoadingId(null);
    }
  };

  const isEmpty = !loading && !error && projects.length === 0;

  if (!user && !loading) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Sign in to see recently viewed codebases"
        description="Connect your GitHub account to view previously analyzed codebases."
      />
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{
              height: 88,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              animation: `pulse 1.5s ease-in-out infinite ${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Something went wrong"
        description={error}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No recently viewed codebases"
        description="Codebases you analyze will appear here for quick access."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {projects.map((p, i) => {
        const isLoading = loadingId === p.id;
        const langColor = getLangColor(p.language);
        return (
          <button
            key={p.id}
            onClick={() => handleOpen(p)}
            disabled={!!loadingId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 20px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              cursor: loadingId ? 'wait' : 'pointer',
              opacity: loadingId && !isLoading ? 0.5 : 1,
              textAlign: 'left',
              width: '100%',
              transition: 'all 200ms var(--ease-out)',
              animation: `fade-in 0.3s var(--ease-out) ${i * 0.04}s both`,
            }}
            onMouseEnter={e => {
              if (!loadingId) {
                e.currentTarget.style.borderColor = 'var(--color-border-visible)';
                e.currentTarget.style.background = 'var(--color-bg-elevated)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
              e.currentTarget.style.background = 'var(--color-bg-surface)';
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: `${langColor}14`,
              border: `1px solid ${langColor}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Code2 size={18} strokeWidth={1.5} style={{ color: langColor }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 600,
                color: 'var(--color-text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                marginBottom: 4,
              }}>
                {p.name}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                fontSize: 12, color: 'var(--color-text-tertiary)',
                flexWrap: 'wrap',
              }}>
                {p.language && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: langColor, flexShrink: 0,
                    }} />
                    {p.language}
                  </span>
                )}
                {p.framework && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Layers size={11} strokeWidth={1.5} />
                    {p.framework}
                  </span>
                )}
                {p.file_count > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FileCode2 size={11} strokeWidth={1.5} />
                    {p.file_count} files
                  </span>
                )}
                <span>{timeAgo(p.created_at)}</span>
              </div>
            </div>

            <div style={{ flexShrink: 0, color: 'var(--color-text-tertiary)' }}>
              {isLoading ? (
                <Loader2 size={16} strokeWidth={1.75} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ArrowRight size={16} strokeWidth={1.75} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: '3rem 2rem',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Icon size={22} strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
      <h3 style={{
        fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)',
        marginBottom: 6,
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: 13, color: 'var(--color-text-tertiary)',
        maxWidth: 300, lineHeight: 1.6, margin: 0,
      }}>
        {description}
      </p>
    </div>
  );
}
