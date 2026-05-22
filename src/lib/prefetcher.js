// Background prefetcher for the pyramid view.
// Centers on the currently focused node and gradually expands outward —
// children first (cascading deeper), then siblings (cascading into theirs).
//
// State lives at module scope so we don't churn the Zustand store on every
// enqueue/pump.

import useStore from '../store/useStore';

const MAX_CONCURRENCY = 3;
const MAX_PRIORITY = 8; // hard cap to stop runaway cascades

const queue = []; // [{ id, priority }]
let inflight = 0;
let activeFocus = null;

function schedule(fn) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(fn, { timeout: 1500 });
  } else {
    setTimeout(fn, 0);
  }
}

function alreadyQueued(id) {
  for (const item of queue) if (item.id === id) return true;
  return false;
}

function isVirtualFunctionId(id) {
  // Skip function-level virtual ids — they don't have a tree_nodes row to fetch.
  return typeof id === 'string' && id.includes('::fn_');
}

function enqueue(id, priority) {
  if (!id || priority > MAX_PRIORITY) return;
  if (isVirtualFunctionId(id)) return;
  const store = useStore.getState();
  if (store.nodes[id]?.zone1) return;
  if (alreadyQueued(id)) return;
  queue.push({ id, priority });
  queue.sort((a, b) => a.priority - b.priority);
  pump();
}

function pump() {
  while (inflight < MAX_CONCURRENCY && queue.length > 0) {
    const next = queue.shift();
    inflight += 1;
    const startedFocus = activeFocus;

    schedule(() => {
      const store = useStore.getState();
      store
        .fetchNode(next.id)
        .then((node) => {
          // Don't cascade if focus shifted mid-flight to avoid wasting work
          // on what is now an old context.
          if (activeFocus !== startedFocus) return;
          if (!node?.children) return;
          for (const c of node.children) {
            enqueue(c.id, next.priority + 1);
          }
        })
        .catch(() => {})
        .finally(() => {
          inflight -= 1;
          pump();
        });
    });
  }
}

// Start (or refocus) the prefetcher around the given node id.
// Resets the pending queue so we re-prioritize from the new focus.
// In-flight requests are not aborted — their results still go to cache.
export function startPrefetch(focusNodeId) {
  activeFocus = focusNodeId;
  queue.length = 0;

  const store = useStore.getState();
  const current = store.nodes[focusNodeId];
  if (!current) return;

  // P1: immediate children of the focused node
  if (current.children) {
    for (const c of current.children) enqueue(c.id, 1);
  }

  // P3: siblings of the focused node (children of its parent in the stack)
  const stack = store.focusStack;
  const idx = stack.indexOf(focusNodeId);
  if (idx > 0) {
    const parentId = stack[idx - 1];
    const parent = store.nodes[parentId];
    if (parent?.children) {
      for (const sib of parent.children) {
        if (sib.id !== focusNodeId) enqueue(sib.id, 3);
      }
    }
  }
}

export function stopPrefetch() {
  activeFocus = null;
  queue.length = 0;
}
