import { useState, useCallback } from 'react';
import { Compass, Send, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import { API_BASE } from '../../lib/api';

const CONFIDENCE_COLOR = {
  high: '#10b981',
  medium: '#f59e0b',
  low: '#f43f5e',
};

export default function JumpPanel({ projectId }) {
  const jumpQuery = useStore((s) => s.jumpQuery);
  const setJumpQuery = useStore((s) => s.setJumpQuery);
  const jumpLoading = useStore((s) => s.jumpLoading);
  const setJumpLoading = useStore((s) => s.setJumpLoading);
  const jumpError = useStore((s) => s.jumpError);
  const setJumpError = useStore((s) => s.setJumpError);
  const jumpLastResult = useStore((s) => s.jumpLastResult);
  const setJumpLastResult = useStore((s) => s.setJumpLastResult);
  const jumpToPath = useStore((s) => s.jumpToPath);

  const [phase, setPhase] = useState(''); // 'resolving' | 'preloading' | 'navigating' | ''

  const submit = useCallback(async () => {
    const q = jumpQuery.trim();
    if (!q || !projectId) return;

    setJumpError(null);
    setJumpLoading(true);
    setPhase('resolving');

    try {
      const res = await fetch(`${API_BASE}/api/node/project/${projectId}/jump`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPhase('preloading');
      setJumpLastResult({
        targetName: data.target?.name ?? 'Unknown',
        targetPath: data.target?.path ?? '',
        confidence: data.confidence ?? 'medium',
        reasoning: data.reasoning ?? '',
      });
      await jumpToPath(data.path);
      setPhase('navigating');
    } catch (err) {
      setJumpError(err.message || 'Jump failed');
    } finally {
      setJumpLoading(false);
      setTimeout(() => setPhase(''), 400);
    }
  }, [jumpQuery, projectId, jumpToPath, setJumpError, setJumpLoading, setJumpLastResult]);

  const onKeyDown = (e) => {
    if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <aside
      style={{
        flex: '0 0 320px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 16,
        background: 'var(--color-bg-surface)',
        borderLeft: '1px solid var(--color-border-subtle)',
        overflowY: 'auto',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Compass size={16} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--color-text-tertiary)',
            margin: 0,
          }}
        >
          Jump to
        </h3>
      </header>

      <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--color-text-tertiary)', margin: 0 }}>
        Describe what you're looking for and I'll take you there.
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 12,
          padding: 12,
        }}
      >
        <textarea
          value={jumpQuery}
          onChange={(e) => setJumpQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="e.g. the file that handles login&#10;or: the auth module"
          rows={3}
          disabled={jumpLoading}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--color-text-primary)',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {jumpLoading ? phaseLabel(phase) : 'Enter to send'}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={jumpLoading || !jumpQuery.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'var(--color-accent)',
              color: 'var(--color-text-inverse)',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              cursor: jumpLoading || !jumpQuery.trim() ? 'not-allowed' : 'pointer',
              opacity: jumpLoading || !jumpQuery.trim() ? 0.5 : 1,
              transition: 'opacity 150ms ease-out',
            }}
          >
            {jumpLoading ? (
              <Loader2 size={12} strokeWidth={2} className="spin" />
            ) : (
              <Send size={12} strokeWidth={2} />
            )}
            {jumpLoading ? 'Working' : 'Jump'}
          </button>
        </div>
      </div>

      {jumpError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: 10,
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            borderRadius: 8,
            fontSize: 12,
            color: '#f43f5e',
          }}
        >
          <AlertCircle size={14} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{jumpError}</span>
        </div>
      )}

      {jumpLastResult && (
        <div
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            borderLeft: `3px solid ${CONFIDENCE_COLOR[jumpLastResult.confidence] ?? '#6366f1'}`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-text-tertiary)',
              marginBottom: 6,
            }}
          >
            Took you to · {jumpLastResult.confidence} confidence
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 4,
              wordBreak: 'break-word',
            }}
          >
            <ChevronRight size={12} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            {jumpLastResult.targetName}
          </div>
          {jumpLastResult.targetPath && (
            <div
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-text-tertiary)',
                marginBottom: 8,
                wordBreak: 'break-all',
              }}
            >
              {jumpLastResult.targetPath}
            </div>
          )}
          {jumpLastResult.reasoning && (
            <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--color-text-secondary)', margin: 0 }}>
              {jumpLastResult.reasoning}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

function phaseLabel(phase) {
  if (phase === 'resolving') return 'Finding the best match…';
  if (phase === 'preloading') return 'Preloading the path…';
  if (phase === 'navigating') return 'Done';
  return 'Working…';
}
