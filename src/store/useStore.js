import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { API_BASE } from '../lib/api';

const useStore = create((set, get) => ({
  // --- Auth ---
  user: null,
  session: null,
  authLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  signOut: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('gui_github_token');
    set({ user: null, session: null });
  },
  getGithubToken: () => {
    const session = get().session;
    return session?.provider_token || localStorage.getItem('gui_github_token');
  },

  // --- My Projects panel cache ---
  cachedProjects: null,
  cachedProjectsAt: 0,
  setCachedProjects: (projects) => set({ cachedProjects: projects, cachedProjectsAt: Date.now() }),

  // --- Project metadata ---
  projectId: null,
  projectMeta: null, // { name, summary, framework, language, file_count }
  setProjectId: (id) => set({ projectId: id }),
  setProjectMeta: (meta) => set({ projectMeta: meta }),

  // --- Pipeline status ---
  pipelineStatus: null,
  pipelineProgress: null,
  setPipelineStatus: (status) => set({ pipelineStatus: status }),
  setPipelineProgress: (progress) => set({ pipelineProgress: progress }),
  processingStatus: '',
  setProcessingStatus: (status) => set({ processingStatus: status }),
  processingError: null,
  setProcessingError: (err) => set({ processingError: err }),
  _sseCleanup: null,
  setSseCleanup: (fn) => set({ _sseCleanup: fn }),

  cancelPipeline: async () => {
    const { projectId, _sseCleanup } = get();
    if (_sseCleanup) _sseCleanup();
    if (projectId) {
      try {
        await fetch(`${API_BASE}/api/pipeline/${projectId}/cancel`, { method: 'POST' });
      } catch (e) { console.error('Cancel failed:', e); }
    }
    localStorage.removeItem('gui_active_project');
    get().resetProject();
  },

  rerunPipeline: async () => {
    const { projectId, user } = get();
    if (!projectId) return false;
    set({
      processingError: null,
      processingStatus: 'Preparing to re-analyze...',
      pipelineStatus: 'pending',
      pipelineProgress: null,
      nodes: {},
      focusStack: [],
      focusNodeId: null,
    });
    try {
      const res = await fetch(`${API_BASE}/api/pipeline/${projectId}/rerun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        set({ processingError: { message: err.error || 'Rerun failed' }, pipelineStatus: 'failed' });
        return false;
      }
      localStorage.setItem('gui_active_project', projectId);
      return true;
    } catch (err) {
      set({ processingError: { message: err.message || 'Network error' }, pipelineStatus: 'failed' });
      return false;
    }
  },

  // --- Node cache (filesystem pyramid) ---
  // nodes[id] = { id, name, kind, path, zone1, children: [{id,name,kind,brief_summary}] }
  nodes: {},
  nodesLoading: new Set(),
  // In-flight describe promises, keyed by nodeId. Lets prefetch + user click share one request.
  _inflightFetches: new Map(),
  rootId: null,
  setRootId: (id) => set({ rootId: id }),

  fetchProjectRoot: async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/api/node/project/${projectId}/root`);
      if (!res.ok) return null;
      const { rootId } = await res.json();
      set({ rootId });
      return rootId;
    } catch (err) {
      console.error('fetchProjectRoot failed:', err);
      return null;
    }
  },

  fetchNode: (nodeId) => {
    const state = get();
    if (state.nodes[nodeId]?.zone1) return Promise.resolve(state.nodes[nodeId]);

    const existing = state._inflightFetches.get(nodeId);
    if (existing) return existing;

    const work = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/node/${encodeURIComponent(nodeId)}/describe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`describe failed: ${res.status}`);
        const data = await res.json();
        const cached = {
          id: data.node.id,
          name: data.node.name,
          kind: data.node.kind,
          path: data.node.path,
          zone1: data.node.zone1,
          children: data.children,
        };
        set((s) => {
          const loading = new Set(s.nodesLoading);
          loading.delete(nodeId);
          return { nodes: { ...s.nodes, [nodeId]: cached }, nodesLoading: loading };
        });
        return cached;
      } catch (err) {
        console.error('fetchNode failed:', err);
        set((s) => {
          const loading = new Set(s.nodesLoading);
          loading.delete(nodeId);
          return { nodesLoading: loading };
        });
        return null;
      } finally {
        get()._inflightFetches.delete(nodeId);
      }
    })();

    state._inflightFetches.set(nodeId, work);
    const nextLoading = new Set(state.nodesLoading);
    nextLoading.add(nodeId);
    set({ nodesLoading: nextLoading });
    return work;
  },

  // Prefetch siblings in the background (one level ahead). Idempotent; cached/in-flight
  // ids are no-ops. Returns immediately; in-flight requests continue independently.
  prefetchChildren: (parentId) => {
    const state = get();
    const parent = state.nodes[parentId];
    if (!parent?.children) return;
    const schedule = (cb) =>
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? window.requestIdleCallback(cb, { timeout: 1500 })
        : setTimeout(cb, 0);
    for (const child of parent.children) {
      if (state.nodes[child.id]?.zone1) continue;
      if (state._inflightFetches.has(child.id)) continue;
      schedule(() => {
        // fire-and-forget; result lands in store cache
        get().fetchNode(child.id);
      });
    }
  },

  // --- Pyramid drill navigation ---
  focusStack: [],         // [rootId, ...descendantIds]
  focusNodeId: null,
  drillTransition: null,

  setFocus: (id) => set({ focusStack: [id], focusNodeId: id, drillTransition: null }),

  // Used by Jump-to-feature: load every ancestor's description so back-out is instant,
  // then snap focus to the full path.
  jumpToPath: async (path) => {
    if (!path || path.length === 0) return;
    const { fetchNode } = get();
    await Promise.all(path.map((id) => fetchNode(id)));
    const targetId = path[path.length - 1];
    set({
      focusStack: [...path],
      focusNodeId: targetId,
      drillTransition: { type: 'in', targetId, startedAt: Date.now() },
    });
  },

  // --- Jump-to panel state ---
  jumpQuery: '',
  jumpLoading: false,
  jumpError: null,
  jumpLastResult: null, // { targetName, reasoning, confidence }
  setJumpQuery: (q) => set({ jumpQuery: q }),
  setJumpLoading: (loading) => set({ jumpLoading: loading }),
  setJumpError: (err) => set({ jumpError: err }),
  setJumpLastResult: (result) => set({ jumpLastResult: result }),

  drillInto: (nodeId) => {
    const state = get();
    if (nodeId === state.focusNodeId) return;
    set({
      focusStack: [...state.focusStack, nodeId],
      focusNodeId: nodeId,
      drillTransition: { type: 'in', targetId: nodeId, startedAt: Date.now() },
    });
  },

  drillOut: () => {
    const state = get();
    if (state.focusStack.length <= 1) return;
    const nextStack = state.focusStack.slice(0, -1);
    const parentId = nextStack[nextStack.length - 1];
    set({
      focusStack: nextStack,
      focusNodeId: parentId,
      drillTransition: { type: 'out', targetId: parentId, startedAt: Date.now() },
    });
  },

  drillToLevel: (index) => {
    const state = get();
    if (index < 0 || index >= state.focusStack.length) return;
    const nextStack = state.focusStack.slice(0, index + 1);
    const targetId = nextStack[nextStack.length - 1];
    set({
      focusStack: nextStack,
      focusNodeId: targetId,
      drillTransition: { type: 'out', targetId, startedAt: Date.now() },
    });
  },

  clearDrillTransition: () => set({ drillTransition: null }),

  // --- Chat ---
  chatMessages: [],
  chatLoading: false,
  chatPanelOpen: false,
  commandPaletteOpen: false,
  chatStreamingText: '',
  pendingQuote: null,
  addChatMessage: (message) => set((s) => ({ chatMessages: [...s.chatMessages, message] })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  setChatLoading: (loading) => set({ chatLoading: loading }),
  setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setChatStreamingText: (text) => set({ chatStreamingText: text }),
  setPendingQuote: (text) => set({ pendingQuote: text }),
  clearChat: () => set({
    chatMessages: [],
    chatLoading: false,
    chatStreamingText: '',
    pendingQuote: null,
  }),

  // --- Theme ---
  darkMode: (() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage?.getItem('gui_theme');
    return saved === 'dark';
  })(),
  toggleDarkMode: () => set((s) => {
    const next = !s.darkMode;
    try { window.localStorage?.setItem('gui_theme', next ? 'dark' : 'light'); } catch {}
    return { darkMode: next };
  }),

  // --- Toast ---
  toast: null,
  showToast: (message, duration = 2000) => {
    set({ toast: message });
    setTimeout(() => set({ toast: null }), duration);
  },

  // --- Onboarding ---
  showOnboarding: true,
  dismissOnboarding: () => set({ showOnboarding: false }),

  // --- Upload feature flag ---
  uploadEnabled: true,

  // --- Persona pill (vestigial, kept for upload screen UI) ---
  persona: (() => {
    if (typeof window === 'undefined') return null;
    try { return window.localStorage?.getItem('gui_persona') || null; } catch { return null; }
  })(),
  setPersona: (persona) => {
    try { window.localStorage?.setItem('gui_persona', persona || ''); } catch {}
    set({ persona });
  },

  // --- Reset on project switch ---
  resetProject: () => set({
    projectId: null,
    projectMeta: null,
    pipelineStatus: null,
    pipelineProgress: null,
    processingError: null,
    nodes: {},
    nodesLoading: new Set(),
    rootId: null,
    focusStack: [],
    focusNodeId: null,
    drillTransition: null,
    chatMessages: [],
    chatLoading: false,
    chatPanelOpen: false,
    commandPaletteOpen: false,
    chatStreamingText: '',
    pendingQuote: null,
    showOnboarding: true,
    toast: null,
    jumpQuery: '',
    jumpLoading: false,
    jumpError: null,
    jumpLastResult: null,
  }),
}));

export default useStore;
