const codeBlockStyle = {
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: 13,
  lineHeight: 1.7,
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '14px 18px',
  overflowX: 'auto',
  whiteSpace: 'pre',
};

export default function DocsCLIReference({ commands, flags }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {commands && (
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-tertiary)',
            marginBottom: 10,
          }}>
            Commands
          </div>
          <div style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            {commands.map((cmd, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 16,
                  padding: '10px 16px',
                  borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none',
                  flexWrap: 'wrap',
                }}
              >
                <code style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-accent)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {cmd.command}
                </code>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {cmd.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {flags && (
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-tertiary)',
            marginBottom: 10,
          }}>
            Flags
          </div>
          <div style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            {flags.map((fl, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 16,
                  padding: '10px 16px',
                  borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none',
                  flexWrap: 'wrap',
                }}
              >
                <code style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-accent)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {fl.flag}
                </code>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {fl.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
