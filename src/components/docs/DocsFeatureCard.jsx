export default function DocsFeatureCard({ items }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: 12,
    }}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            style={{
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 18px',
              transition: 'border-color 150ms ease-out, transform 150ms ease-out',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-visible)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {Icon && <Icon size={18} strokeWidth={1.75} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {item.title}
              </div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
              {item.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}
