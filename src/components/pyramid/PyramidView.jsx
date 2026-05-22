import { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronRight, ChevronLeft, Home } from 'lucide-react';
import useStore from '../../store/useStore';
import { API_BASE } from '../../lib/api';
import NodeCard from './NodeCard';
import Zone1Description from './Zone1Description';
import NodeGridSkeleton from './NodeGridSkeleton';
import JumpPanel from './JumpPanel';
import { startPrefetch, stopPrefetch } from '../../lib/prefetcher';

export default function PyramidView() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const focusStack = useStore((s) => s.focusStack);
  const focusNodeId = useStore((s) => s.focusNodeId);
  const nodes = useStore((s) => s.nodes);
  const nodesLoading = useStore((s) => s.nodesLoading);
  const rootId = useStore((s) => s.rootId);
  const projectMeta = useStore((s) => s.projectMeta);
  const setProjectId = useStore((s) => s.setProjectId);
  const setProjectMeta = useStore((s) => s.setProjectMeta);
  const fetchProjectRoot = useStore((s) => s.fetchProjectRoot);
  const fetchNode = useStore((s) => s.fetchNode);
  const setFocus = useStore((s) => s.setFocus);
  const drillInto = useStore((s) => s.drillInto);
  const drillOut = useStore((s) => s.drillOut);
  const drillToLevel = useStore((s) => s.drillToLevel);

  // Load project metadata + root node on mount / project change.
  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pipeline/${projectId}/status`);
        if (res.ok) {
          const meta = await res.json();
          if (!cancelled) setProjectMeta(meta);
        }
      } catch {}

      if (!cancelled) {
        const id = await fetchProjectRoot(projectId);
        if (id && !cancelled) setFocus(id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, setProjectId, setProjectMeta, fetchProjectRoot, setFocus]);

  // Fetch the focused node, then kick off the background prefetcher which
  // expands outward in priority order: children → grandchildren → siblings →
  // sibling-children, capped at 3 concurrent requests.
  useEffect(() => {
    if (!focusNodeId) return;
    let cancelled = false;
    fetchNode(focusNodeId).then(() => {
      if (cancelled) return;
      startPrefetch(focusNodeId);
    });
    return () => {
      cancelled = true;
    };
  }, [focusNodeId, fetchNode]);

  // Stop prefetching when the view unmounts.
  useEffect(() => {
    return () => stopPrefetch();
  }, []);

  // Keyboard nav: Backspace / Escape → drill out.
  useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      const editing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (editing) return;
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (focusStack.length > 1) {
          e.preventDefault();
          drillOut();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusStack.length, drillOut]);

  const handleChildClick = useCallback(
    (child) => {
      drillInto(child.id);
    },
    [drillInto],
  );

  const currentNode = focusNodeId ? nodes[focusNodeId] : null;
  const loading = focusNodeId ? nodesLoading.has(focusNodeId) && !currentNode : true;

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        background: 'var(--color-bg-base)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(12px, 2vw, 24px)',
          gap: 12,
        }}
      >
        <Breadcrumbs
          stack={focusStack}
          nodes={nodes}
          rootName={projectMeta?.name ?? '(root)'}
          onCrumbClick={drillToLevel}
          onExit={() => navigate('/')}
        />

        <div
          style={{
            flex: '0 0 auto',
            maxHeight: 'min(42vh, 380px)',
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          <Zone1Description node={currentNode} loading={loading} />
        </div>

        <div
          className="mx-auto w-full"
          style={{
            maxWidth: 1200,
            flex: '1 1 0',
            minHeight: 0,
            overflowY: 'auto',
            paddingTop: 4,
            paddingRight: 4,
          }}
        >
          {loading ? (
            <NodeGridSkeleton count={6} />
          ) : currentNode?.children?.length ? (
            <div
              className="grid"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {currentNode.children.map((child, idx) => (
                <NodeCard key={child.id} node={child} index={idx} onClick={handleChildClick} />
              ))}
            </div>
          ) : (
            <EmptyChildren kind={currentNode?.kind} />
          )}
        </div>
      </div>

      <JumpPanel projectId={projectId} />

      {focusStack.length > 1 && (
        <button
          type="button"
          onClick={drillOut}
          className="graph-back-fab fixed flex items-center gap-2 px-4 py-2.5 rounded-full"
          style={{
            bottom: 28,
            left: 28,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            zIndex: 30,
            boxShadow: 'var(--shadow-soft)',
          }}
          aria-label="Drill out"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
          <span className="text-sm">Back</span>
        </button>
      )}
    </div>
  );
}

function Breadcrumbs({ stack, nodes, rootName, onCrumbClick, onExit }) {
  if (!stack.length) return null;
  return (
    <nav
      className="flex items-center gap-1.5 flex-wrap text-sm"
      style={{ color: 'var(--color-text-tertiary)' }}
      aria-label="Breadcrumb"
    >
      <button
        type="button"
        onClick={onExit}
        className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
        style={{ color: 'var(--color-text-secondary)' }}
        title="My projects"
      >
        <Home size={14} strokeWidth={1.5} />
      </button>
      {stack.map((id, idx) => {
        const isLast = idx === stack.length - 1;
        const label = idx === 0 ? rootName : nodes[id]?.name ?? '…';
        return (
          <span key={id} className="flex items-center gap-1.5">
            <ChevronRight size={12} strokeWidth={1.5} />
            <button
              type="button"
              onClick={() => !isLast && onCrumbClick(idx)}
              disabled={isLast}
              className="px-2 py-1 rounded-md transition-colors"
              style={{
                color: isLast ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: isLast ? 600 : 500,
                cursor: isLast ? 'default' : 'pointer',
              }}
            >
              {label}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

function EmptyChildren({ kind }) {
  let msg = 'No children to display.';
  if (kind === 'file') msg = 'This file has no extractable code blocks.';
  else if (kind === 'folder') msg = 'This folder is empty.';
  else if (kind === 'function_group') msg = 'No further breakdown available for this block.';
  return (
    <div
      className="rounded-xl text-center"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px dashed var(--color-border-subtle)',
        color: 'var(--color-text-tertiary)',
        padding: '32px 24px',
        fontSize: 14,
      }}
    >
      {msg}
    </div>
  );
}
