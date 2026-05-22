import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

/**
 * Sticky back-navigation bar. Drop into any page that needs a back button.
 * @param {{ to?: string, label?: string, children?: React.ReactNode }} props
 *   - `to`: explicit path. Falls back to `navigate(-1)` if omitted.
 *   - `label`: text next to the back arrow (default: page title or nothing).
 *   - `children`: optional right-side slot (e.g. action buttons).
 */
export default function BackBar({ to, fallback = '/upload', label, children }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '0 clamp(0.75rem, 2vw, 1.25rem)',
        height: 48,
        background: 'var(--color-bg-elevated)',
        borderBottom: '1px solid var(--color-border-subtle)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button
          onClick={() => {
            if (to) navigate(to);
            else if (window.history.length > 1) navigate(-1);
            else navigate(fallback);
          }}
          aria-label="Go back"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-sunken)',
            border: 'none',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: `all var(--duration-base) var(--ease-out)`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--color-border-visible)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--color-bg-sunken)';
            e.currentTarget.style.color = 'var(--color-text-tertiary)';
          }}
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </button>
        {label && (
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {label}
          </span>
        )}
      </div>
      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}
