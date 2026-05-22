import { useNavigate } from 'react-router';
import { Sun, Moon, LogOut, Brain, Sparkles, Code2, BookOpen, ChevronRight, BarChart3, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';
import { usePipelineListener } from '../hooks/usePipelineListener';
import { supabase } from '../lib/supabase';
import BackBar from './BackBar';

const DEPTH_LEVELS = [
  { id: 'beginner', label: 'Conceptual', icon: Sparkles },
  { id: 'intermediate', label: 'Applied', icon: Brain },
  { id: 'advanced', label: 'Under the Hood', icon: Code2 },
];

function SegmentedControl({ options, value, onChange }) {
  const activeIndex = options.findIndex(o => o.id === value);
  const count = options.length;

  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      padding: 3,
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-sunken)',
      border: '1px solid var(--color-border-subtle)',
      width: '100%',
    }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 3,
          bottom: 3,
          left: `calc(${activeIndex} * (100% / ${count}) + 3px)`,
          width: `calc(100% / ${count} - 6px)`,
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-xs)',
          transition: 'left var(--duration-base) var(--ease-out)',
        }}
      />
      {options.map(opt => {
        const Icon = opt.icon;
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              position: 'relative',
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: active ? 'var(--color-accent-active)' : 'var(--color-text-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color var(--duration-base) var(--ease-out)',
              whiteSpace: 'nowrap',
            }}
          >
            {Icon && <Icon size={13} strokeWidth={1.75} />}
            <span className="settings-seg-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? 'var(--color-accent)' : 'var(--color-bg-sunken)',
        border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--color-border-visible)'}`,
        cursor: 'pointer',
        transition: 'all var(--duration-base) var(--ease-out)',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: checked ? 22 : 2,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: checked ? 'var(--color-text-inverse)' : 'var(--color-text-tertiary)',
        transition: 'all var(--duration-base) var(--ease-out)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '16px 0',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          marginBottom: description ? 4 : 0,
        }}>
          {label}
        </div>
        {description && (
          <div style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            lineHeight: 1.5,
          }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 'clamp(16px, 3vw, 24px)',
      animation: 'fade-in 0.3s var(--ease-out)',
    }}>
      {title && (
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-tertiary)',
          marginBottom: 12,
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export default function SettingsScreen() {
  const navigate = useNavigate();
  const user = useStore(s => s.user);
  const darkMode = useStore(s => s.darkMode);
  const toggleDarkMode = useStore(s => s.toggleDarkMode);
  const signOut = useStore(s => s.signOut);
  const projectId = useStore(s => s.projectId);
  const { startListening } = usePipelineListener();

  const avatarUrl = user?.user_metadata?.avatar_url;
  const username = user?.user_metadata?.user_name;
  const email = user?.email;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg-base)',
    }}>
      <BackBar label="Settings" />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 3vw, 2rem)',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 640,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* Account section */}
          {user && (
            <SectionCard title="Account">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}>
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt=""
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-subtle)',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  {username && (
                    <div style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: 2,
                    }}>
                      {username}
                    </div>
                  )}
                  {email && (
                    <div style={{
                      fontSize: 13,
                      color: 'var(--color-text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {email}
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {/* Preferences section */}
          <SectionCard title="Preferences">
            <div>
              <div style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                marginBottom: 4,
              }}>
                Theme
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                lineHeight: 1.5,
                marginBottom: 12,
              }}>
                Choose between light and dark appearance
              </div>
              <SegmentedControl
                options={[
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                ]}
                value={darkMode ? 'dark' : 'light'}
                onChange={(id) => {
                  if ((id === 'dark') !== darkMode) toggleDarkMode();
                }}
              />
            </div>

          </SectionCard>

          {/* Help & Documentation */}
          <SectionCard title="Help">
            <button
              onClick={() => navigate('/docs')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-primary)',
                transition: 'color var(--duration-base) var(--ease-out)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent-active)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg-sunken)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <BookOpen size={16} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Documentation</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  Features, shortcuts, CLI reference, and more
                </div>
              </div>
              <ChevronRight size={16} strokeWidth={1.75} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            </button>
          </SectionCard>

          {/* Admin */}
          {email === 'gordonj2016@outlook.com' && (
            <SectionCard title="Admin">
              <button
                onClick={() => navigate('/admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '12px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-primary)',
                  transition: 'color var(--duration-base) var(--ease-out)',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent-active)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg-sunken)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <BarChart3 size={16} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Spending Dashboard</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    API costs, usage tracking, per-project breakdown
                  </div>
                </div>
                <ChevronRight size={16} strokeWidth={1.75} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
              </button>
            </SectionCard>
          )}

          {/* Project actions */}
          {projectId && (
            <SectionCard title="Project">
              <button
                onClick={async () => {
                  const success = await useStore.getState().rerunPipeline();
                  if (success) {
                    navigate('/processing', { replace: true });
                    setTimeout(() => startListening(projectId), 100);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '12px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-primary)',
                  transition: 'color var(--duration-base) var(--ease-out)',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent-active)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg-sunken)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <RefreshCw size={16} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Re-analyze project</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    Re-run the analysis pipeline using stored files
                  </div>
                </div>
                <ChevronRight size={16} strokeWidth={1.75} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
              </button>
            </SectionCard>
          )}

          {/* Sign out */}
          {user && (
            <button
              onClick={handleSignOut}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 20px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: '1px solid var(--color-border-subtle)',
                cursor: 'pointer',
                transition: 'all var(--duration-base) var(--ease-out)',
                width: '100%',
                marginTop: 8,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-bg-surface)';
                e.currentTarget.style.borderColor = 'var(--color-border-visible)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <LogOut size={14} strokeWidth={1.75} />
              Sign out
            </button>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .settings-seg-label { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}
