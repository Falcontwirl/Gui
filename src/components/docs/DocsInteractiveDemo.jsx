import { MousePointer, Maximize2, ZoomIn, Move } from 'lucide-react';

const DEMO_ICONS = {
  click: MousePointer,
  expand: Maximize2,
  zoom: ZoomIn,
  pan: Move,
};

const DEMO_ANIMATIONS = {
  click: `
    @keyframes demo-click {
      0%, 100% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.15); opacity: 1; }
    }
  `,
  expand: `
    @keyframes demo-expand {
      0%, 100% { transform: scale(0.85); opacity: 0.6; }
      50% { transform: scale(1.2); opacity: 1; }
    }
  `,
  zoom: `
    @keyframes demo-zoom {
      0%, 100% { transform: scale(0.9); }
      50% { transform: scale(1.25); }
    }
  `,
  pan: `
    @keyframes demo-pan {
      0%, 100% { transform: translateX(-4px); }
      50% { transform: translateX(4px); }
    }
  `,
};

function DemoIcon({ demo }) {
  const Icon = DEMO_ICONS[demo];
  if (!Icon) return null;

  const animName = `demo-${demo}`;

  return (
    <>
      <style>{DEMO_ANIMATIONS[demo]}{`
        @media (prefers-reduced-motion: reduce) {
          .demo-anim-${demo} { animation: none !important; }
        }
      `}</style>
      <div
        className={`demo-anim-${demo}`}
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          animation: `${animName} 2s ease-in-out infinite`,
        }}
      >
        <Icon size={18} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />
      </div>
    </>
  );
}

export default function DocsInteractiveDemo({ items }) {
  return (
    <div style={{
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 16px',
            borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none',
          }}
        >
          {item.demo ? (
            <DemoIcon demo={item.demo} />
          ) : (
            <div style={{ width: 40, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {item.action}
              </span>
              {item.target && (
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  {item.target}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {item.result}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
