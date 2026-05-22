export default function NodeGridSkeleton({ count = 6 }) {
  return (
    <div
      className="grid w-full mx-auto"
      style={{
        maxWidth: 1200,
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            borderLeft: '3px solid var(--color-border-subtle)',
            borderRadius: 12,
            padding: 18,
            minHeight: 100,
          }}
        >
          <div
            style={{
              height: 12,
              width: '40%',
              borderRadius: 4,
              marginBottom: 14,
              background: 'var(--color-bg-surface)',
              backgroundSize: '200% 100%',
              animation: `shimmer 1.6s linear ${i * 0.05}s infinite`,
            }}
          />
          <div
            style={{
              height: 14,
              width: '70%',
              borderRadius: 4,
              marginBottom: 10,
              background: 'var(--color-bg-surface)',
              animation: `shimmer 1.6s linear ${i * 0.05 + 0.1}s infinite`,
            }}
          />
          <div
            style={{
              height: 10,
              width: '95%',
              borderRadius: 4,
              marginBottom: 6,
              background: 'var(--color-bg-surface)',
              animation: `shimmer 1.6s linear ${i * 0.05 + 0.2}s infinite`,
            }}
          />
          <div
            style={{
              height: 10,
              width: '60%',
              borderRadius: 4,
              background: 'var(--color-bg-surface)',
              animation: `shimmer 1.6s linear ${i * 0.05 + 0.3}s infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
