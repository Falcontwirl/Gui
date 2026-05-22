import { useState } from 'react';
import { List, X } from 'lucide-react';

export default function DocsSidebar({ sections, activeId }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleClick = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileOpen(false);
  };

  const navItems = sections.map(s => {
    const Icon = s.icon;
    const active = s.id === activeId;
    return (
      <button
        key={s.id}
        onClick={() => handleClick(s.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 12px',
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: active ? 'var(--color-accent-active)' : 'var(--color-text-secondary)',
          background: active ? 'var(--color-bg-elevated)' : 'transparent',
          border: 'none',
          borderLeft: active ? '2px solid var(--color-accent)' : '2px solid transparent',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 150ms ease-out',
        }}
      >
        {Icon && <Icon size={14} strokeWidth={1.75} />}
        {s.title}
      </button>
    );
  });

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="docs-sidebar-desktop" style={{
        width: 200,
        flexShrink: 0,
        position: 'sticky',
        top: 72,
        alignSelf: 'flex-start',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        paddingRight: 16,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-tertiary)',
          padding: '0 12px 8px',
        }}>
          Contents
        </div>
        {navItems}
      </nav>

      {/* Mobile FAB + overlay */}
      <button
        className="docs-sidebar-fab"
        onClick={() => setMobileOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--color-accent)',
          color: 'var(--color-text-inverse)',
          border: 'none',
          cursor: 'pointer',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-md)',
          zIndex: 40,
        }}
        aria-label="Table of contents"
      >
        <List size={20} strokeWidth={1.75} />
      </button>

      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
            }}
          />
          <div style={{
            position: 'relative',
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            padding: '16px 16px 32px',
            maxHeight: '60dvh',
            overflowY: 'auto',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}>
                Contents
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  padding: 4,
                }}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {navItems}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1023px) {
          .docs-sidebar-desktop { display: none !important; }
        }
        @media (max-width: 767px) {
          .docs-sidebar-fab { display: flex !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .docs-sidebar-fab { display: flex !important; }
        }
      `}</style>
    </>
  );
}
