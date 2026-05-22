import { Folder, FileCode, Braces } from 'lucide-react';

const KIND_ICON = {
  folder: Folder,
  file: FileCode,
  function_group: Braces,
};

export default function Zone1Description({ node, loading }) {
  const Icon = KIND_ICON[node?.kind] ?? Folder;

  return (
    <section
      className="mx-auto w-full"
      style={{
        maxWidth: 760,
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 16,
        padding: 'clamp(20px, 3vw, 32px)',
        boxShadow: 'var(--shadow-soft, 0 4px 24px rgba(0,0,0,0.08))',
      }}
    >
      <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
        <Icon size={18} strokeWidth={1.5} />
        <span className="text-xs uppercase tracking-wide font-medium">
          {node?.kind ?? 'node'}
        </span>
        {node?.path && (
          <span
            className="text-xs font-mono truncate"
            style={{ color: 'var(--color-text-tertiary)' }}
            title={node.path}
          >
            {node.path || '(root)'}
          </span>
        )}
      </div>

      <h1
        className="text-xl font-semibold mb-4"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {node?.name ?? '...'}
      </h1>

      {loading ? (
        <SkeletonLines />
      ) : node?.zone1 ? (
        <div
          className="space-y-3"
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          {node.zone1.split(/\n\s*\n/).map((para, idx) => (
            <p key={idx}>{renderInline(para.trim())}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          No description yet.
        </p>
      )}
    </section>
  );
}

function renderInline(text) {
  // Split on **bolded** spans. The capture group keeps the markers visible so
  // alternating positions identify which side is plain vs. bold.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const inner = part.slice(2, -2);
      return <DependencyChip key={i} name={inner} />;
    }
    return part;
  });
}

function DependencyChip({ name }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        padding: '1px 8px',
        margin: '0 2px',
        background: 'rgba(99, 102, 241, 0.12)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        color: '#6366f1',
        borderRadius: 6,
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        fontSize: '0.85em',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {name}
    </span>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 14,
            borderRadius: 6,
            background:
              'linear-gradient(90deg, var(--color-bg-surface) 0%, var(--color-bg-base) 50%, var(--color-bg-surface) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.6s linear infinite',
            width: `${100 - i * 12}%`,
          }}
        />
      ))}
    </div>
  );
}
