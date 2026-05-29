import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Upload, Link2, Clock } from 'lucide-react';
import useStore from '../store/useStore';
import { usePipelineListener } from '../hooks/usePipelineListener';
import { API_BASE } from '../lib/api';
import { fetchAndLoadProject } from '../lib/loadProject';

import SourceTabs from './upload/SourceTabs';
import GitHubReposPanel from './upload/GitHubReposPanel';
import ZipUploadPanel from './upload/ZipUploadPanel';
import PasteUrlPanel from './upload/PasteUrlPanel';
import MyProjectsPanel from './upload/MyProjectsPanel';
import BackBar from './BackBar';

// Inline GitHub icon — lucide-react v1.7 doesn't ship one.
const Github = ({ size = 16, strokeWidth = 1.75, color = 'currentColor', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const BASE_TABS = [
  { id: 'url', label: 'Paste URL', icon: Link2 },
  { id: 'repos', label: 'GitHub repos', icon: Github },
  { id: 'zip', label: 'Upload .zip', icon: Upload },
  { id: 'projects', label: 'Recently viewed', icon: Clock },
];

const PERSONAS = [
  { id: 'oss', label: 'I\u2019m contributing to an open-source project' },
  { id: 'onboarding', label: 'I\u2019m onboarding to a new codebase' },
  { id: 'dd_legacy', label: 'I\u2019m doing due diligence or a legacy audit' },
];

const TAB_STORAGE_KEY = 'gui_upload_tab';

export default function UploadScreen() {
  const session = useStore(s => s.session);
  const persona = useStore(s => s.persona);
  const setPersona = useStore(s => s.setPersona);
  const setProcessingStatus = useStore(s => s.setProcessingStatus);
  const setProjectId = useStore(s => s.setProjectId);
  const navigate = useNavigate();
  const mountedRef = useRef(false);
  const { startListening } = usePipelineListener();

  const hasGithub = !!session?.provider_token;

  // Restore tab after OAuth redirect, or pick a smart default
  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (saved && BASE_TABS.some(t => t.id === saved)) {
      sessionStorage.removeItem(TAB_STORAGE_KEY);
      return saved;
    }
    return hasGithub ? 'repos' : 'url';
  });

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // On mount, check for an in-progress pipeline and resume — but verify status first
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const savedProjectId = localStorage.getItem('gui_active_project');
    if (!savedProjectId) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pipeline/${savedProjectId}/status`);
        const { status } = await res.json();

        if (status === 'pending' || status === 'processing' || status?.startsWith('stage_')) {
          navigate('/processing', { replace: true });
          setProcessingStatus('Reconnecting to pipeline...');
          setProjectId(savedProjectId);
          startListening(savedProjectId);
        } else if (status === 'complete' || status === 'enriched') {
          const ok = await fetchAndLoadProject(savedProjectId);
          if (ok) navigate(`/explore/${savedProjectId}`, { replace: true });
        } else {
          localStorage.removeItem('gui_active_project');
        }
      } catch {
        localStorage.removeItem('gui_active_project');
      }
    })();
  }, []);

  return (
    <div style={{
      width: '100%', minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--color-bg-base)',
    }}>
      <BackBar to="/" label="Gui" />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 'clamp(2rem, 5vw, 3rem) clamp(1rem, 3vw, 2rem)',
      }}>
      {/* Header */}
      <div style={{
        textAlign: 'center', maxWidth: 640,
        marginBottom: 'clamp(1.5rem, 3vw, 2rem)',
        animation: 'fade-in 0.4s var(--ease-out)',
      }}>
        <h1 className="serif" style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 500,
          letterSpacing: '-0.02em', color: 'var(--color-text-primary)',
          lineHeight: 1.1, marginBottom: '0.75rem',
        }}>
          Analyze any codebase
        </h1>
        <p style={{
          fontSize: 'clamp(0.95rem, 1.5vw, 1.05rem)',
          color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: 0,
        }}>
          Paste a GitHub URL, connect your repos, upload a zip, or explore open-source projects.
        </p>
      </div>

      {/* Persona pills */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8,
        marginBottom: 'clamp(1.5rem, 3vw, 2rem)', justifyContent: 'center',
      }}>
        {PERSONAS.map(p => (
          <button
            key={p.id}
            onClick={() => setPersona(persona === p.id ? null : p.id)}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-pill)',
              fontSize: 12, fontWeight: 500,
              background: persona === p.id ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
              color: persona === p.id ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
              border: `1px solid ${persona === p.id ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
              cursor: 'pointer',
              transition: `all var(--duration-base) var(--ease-out)`,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{
        width: '100%', maxWidth: 720,
        display: 'flex', flexDirection: 'column',
        gap: 'clamp(1rem, 2.5vw, 1.5rem)',
      }}>
        <SourceTabs tabs={BASE_TABS} activeTab={activeTab} onTabChange={handleTabChange} />

        <div style={{ animation: 'fade-in 0.25s var(--ease-out)' }} key={activeTab}>
          {activeTab === 'url' && <PasteUrlPanel />}
          {activeTab === 'repos' && <GitHubReposPanel />}
          {activeTab === 'zip' && <ZipUploadPanel />}
          {activeTab === 'projects' && <MyProjectsPanel />}
        </div>
      </div>

      </div>
    </div>
  );
}
