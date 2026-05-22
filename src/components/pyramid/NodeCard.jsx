import { useState } from 'react';
import { Folder, FileCode, Braces, FunctionSquare, Flame } from 'lucide-react';
import useStore from '../../store/useStore';

const KIND_STYLE = {
  folder: { color: '#6366f1', Icon: Folder, label: 'Folder' },
  file: { color: '#10b981', Icon: FileCode, label: 'File' },
  function_group: { color: '#f59e0b', Icon: Braces, label: 'Block' },
  function: { color: '#06b6d4', Icon: FunctionSquare, label: 'Function' },
};

const IMPORTANCE = {
  core: {
    label: 'Core',
    Icon: Flame,
    bg: 'rgba(249, 115, 22, 0.14)',
    border: 'rgba(249, 115, 22, 0.45)',
    text: '#f97316',
    cardOpacity: 1,
    cardBorderTint: 'rgba(249, 115, 22, 0.18)',
  },
  boilerplate: {
    label: 'Boilerplate',
    Icon: null,
    bg: 'transparent',
    border: 'var(--color-border-subtle)',
    text: 'var(--color-text-tertiary)',
    cardOpacity: 0.68,
    cardBorderTint: null,
  },
  standard: null, // rendered with no badge
};

export default function NodeCard({ node, index = 0, onClick }) {
  const [hovered, setHovered] = useState(false);
  const style = KIND_STYLE[node.kind] ?? KIND_STYLE.folder;
  const { color, Icon } = style;
  const importance = node.importance && IMPORTANCE[node.importance] ? IMPORTANCE[node.importance] : null;
  // Loading if the prefetcher (or a user click) is currently fetching this node's description.
  const loading = useStore((s) => s.nodesLoading.has(node.id));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(node);
    }
  };

  const cardOpacity = importance?.cardOpacity ?? 1;
  const cardBorderColor = hovered
    ? color + '40'
    : importance?.cardBorderTint ?? 'var(--color-border-subtle)';

  return (
    <button
      type="button"
      onClick={() => onClick?.(node)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={handleKeyDown}
      className="text-left rounded-xl cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 relative"
      style={{
        background: 'var(--color-bg-elevated)',
        border: `1px solid ${cardBorderColor}`,
        borderLeft: `3px solid ${color}`,
        padding: 'clamp(14px, 2vw, 18px)',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: hovered ? `0 0 16px ${color}25` : 'none',
        animation: `fade-in 0.45s ease-out ${Math.min(index, 18) * 0.04}s both`,
        minHeight: 100,
        opacity: cardOpacity,
        overflow: 'hidden',
      }}
    >
      {loading && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent 0%, ${color} 40%, ${color} 60%, transparent 100%)`,
            backgroundSize: '200% 100%',
            animation: 'card-load-sweep 1.4s linear infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      {importance && (
        <span
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 7px',
            background: importance.bg,
            border: `1px solid ${importance.border}`,
            color: importance.text,
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            lineHeight: 1.4,
          }}
        >
          {importance.Icon && <importance.Icon size={10} strokeWidth={2} />}
          {importance.label}
        </span>
      )}

      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        <Icon size={16} strokeWidth={1.5} />
        <span
          className="text-[11px] uppercase tracking-wide font-medium"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {style.label}
        </span>
      </div>
      <h4
        className="text-sm font-semibold mb-1.5 break-words"
        style={{
          color: 'var(--color-text-primary)',
          paddingRight: importance ? 80 : 0,
        }}
      >
        {node.name}
      </h4>
      {node.brief_summary && (
        <p
          className="text-xs leading-relaxed"
          style={{
            color: 'var(--color-text-secondary)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {node.brief_summary}
        </p>
      )}
    </button>
  );
}
