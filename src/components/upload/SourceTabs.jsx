import { useRef, useLayoutEffect, useState } from 'react';

export default function SourceTabs({ tabs, activeTab, onTabChange }) {
  const containerRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`[data-tab-id="${activeTab}"]`);
    if (!activeEl) return;
    setIndicator({
      left: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
    });
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        gap: 4,
        padding: 4,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-sunken)',
        border: '1px solid var(--color-border-subtle)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {/* Sliding indicator */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 4,
          left: indicator.left,
          width: indicator.width,
          height: 'calc(100% - 8px)',
          borderRadius: 'calc(var(--radius-md) - 2px)',
          background: 'var(--color-bg-elevated)',
          boxShadow: 'var(--shadow-sm)',
          transition: `left var(--duration-base) var(--ease-out), width var(--duration-base) var(--ease-out)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '10px 16px',
              minHeight: 44,
              borderRadius: 'calc(var(--radius-md) - 2px)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              whiteSpace: 'nowrap',
              transition: `color var(--duration-fast) var(--ease-out)`,
              fontFamily: 'inherit',
            }}
          >
            <Icon size={15} strokeWidth={isActive ? 2 : 1.75} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
