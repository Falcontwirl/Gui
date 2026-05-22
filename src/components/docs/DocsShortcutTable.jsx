const kbdStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 28,
  height: 26,
  padding: '0 8px',
  fontSize: 12,
  fontFamily: 'var(--font-mono, monospace)',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border-visible)',
  borderRadius: 4,
  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  whiteSpace: 'nowrap',
};

function Kbd({ children }) {
  return <span style={kbdStyle}>{children}</span>;
}

function KeyCombo({ keys }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {keys.map((key, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>+</span>}
          <Kbd>{key}</Kbd>
        </span>
      ))}
    </div>
  );
}

export default function DocsShortcutTable({ groups }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {groups.map((group, gi) => (
        <div key={gi}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-tertiary)',
            marginBottom: 10,
          }}>
            {group.name}
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            {group.shortcuts.map((sc, si) => (
              <div
                key={si}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '10px 16px',
                  borderTop: si > 0 ? '1px solid var(--color-border-subtle)' : 'none',
                }}
              >
                <KeyCombo keys={sc.keys} />
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                  {sc.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
