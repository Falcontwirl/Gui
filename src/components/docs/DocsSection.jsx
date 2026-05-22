import DocsFeatureCard from './DocsFeatureCard';
import DocsShortcutTable from './DocsShortcutTable';
import DocsCLIReference from './DocsCLIReference';
import DocsInteractiveDemo from './DocsInteractiveDemo';

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
  margin: '10px 0 0',
};

function renderSubsection(sub, i) {
  switch (sub.type) {
    case 'feature-cards':
      return <DocsFeatureCard key={i} items={sub.items} />;
    case 'interaction-list':
      return <DocsInteractiveDemo key={i} items={sub.items} />;
    case 'shortcut-table':
      return <DocsShortcutTable key={i} groups={sub.groups} />;
    case 'cli-reference':
      return <DocsCLIReference key={i} commands={sub.commands} flags={sub.flags} />;
    case 'prose':
      return (
        <div key={i}>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>
            {sub.content}
          </p>
          {sub.codeBlock && (
            <pre style={codeBlockStyle}>{sub.codeBlock}</pre>
          )}
        </div>
      );
    default:
      return null;
  }
}

export default function DocsSection({ section }) {
  const Icon = section.icon;

  return (
    <section id={section.id} style={{ scrollMarginTop: 80 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
      }}>
        {Icon && (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={16} strokeWidth={1.75} style={{ color: 'var(--color-accent)' }} />
          </div>
        )}
        <h2 style={{
          fontSize: 'clamp(1.15rem, 3vw, 1.35rem)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: 0,
        }}>
          {section.title}
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {section.subsections.map((sub, i) => (
          <div key={i}>
            {sub.title && (
              <h3 style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                margin: '0 0 10px',
              }}>
                {sub.title}
              </h3>
            )}
            {renderSubsection(sub, i)}
          </div>
        ))}
      </div>
    </section>
  );
}
