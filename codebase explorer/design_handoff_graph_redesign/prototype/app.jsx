// app.jsx — top-level app: layout selection, tweaks, state, compose.

const { Graph, Inspector, SubConceptPanel, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakToggle, TweakSlider } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layoutMode": "swimlanes",
  "readingOrder": true,
  "highlightNext": true,
  "edgeLabels": true,
  "fileCount": true,
  "showLayerGuides": true
}/*EDITMODE-END*/;

function App() {
  const [t, setT] = useTweaks(TWEAK_DEFAULTS);
  const [selectedId, setSelectedId] = React.useState(null);
  const [expandedId, setExpandedId] = React.useState(null);
  const [viewSize, setViewSize] = React.useState({ w: 0, h: 0 });
  const stageRef = React.useRef(null);

  React.useLayoutEffect(() => {
    if (!stageRef.current) return;
    const measure = () => {
      const r = stageRef.current.getBoundingClientRect();
      setViewSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  // Build layout based on current tweak selection
  const layout = React.useMemo(() => {
    // Inject sub-concepts if expanded
    let concepts = [...CONCEPTS];
    let edges = [...EDGES];
    if (expandedId && SUB_CONCEPTS[expandedId]) {
      const parent = CONCEPTS.find(c => c.id === expandedId);
      const subs = SUB_CONCEPTS[expandedId].map((s, i) => ({
        ...s,
        layer: parent.layer + 0.5,
        color: parent.color,
        importance: 'supporting',
        order: parent.order * 100 + i,
        _isSub: true,
      }));
      concepts = [...concepts, ...subs];
      edges = [...edges, ...subs.map(s => ({ source: expandedId, target: s.id, label: 'contains', _isSub: true }))];
    }

    // Don't lay out until we know the stage size
    if (!viewSize.w || !viewSize.h) {
      return { nodes: [], edges: [], contentBox: { x: 0, y: 0, w: 1, h: 1 }, layoutKind: t.layoutMode, bands: [], lanes: [], rings: [] };
    }
    const W = viewSize.w;
    const H = viewSize.h;

    if (t.layoutMode === 'radial') return { ...layoutRadial(concepts, edges, W, H), layoutKind: 'radial' };
    if (t.layoutMode === 'swimlanes') return { ...layoutSwimLanes(concepts, edges, W, H), layoutKind: 'swimlanes' };
    return { ...layoutLayered(concepts, edges, W, H), layoutKind: 'layered' };
  }, [t.layoutMode, expandedId, viewSize]);

  const selectedConcept = React.useMemo(() => {
    if (!selectedId) return null;
    return CONCEPTS.find(c => c.id === selectedId) ||
      Object.values(SUB_CONCEPTS).flat().find(s => s.id === selectedId);
  }, [selectedId]);

  const orderedConcepts = React.useMemo(() =>
    [...CONCEPTS].sort((a, b) => a.order - b.order), []);

  const readingIndex = selectedId
    ? orderedConcepts.findIndex(c => c.id === selectedId)
    : -1;

  const nextId = selectedId
    ? (orderedConcepts[readingIndex + 1]?.id || null)
    : orderedConcepts[0]?.id;

  const handleExpand = (id) => {
    setExpandedId(id === expandedId ? null : id);
  };

  const handleNext = () => {
    const nextConcept = orderedConcepts[readingIndex + 1];
    if (nextConcept) setSelectedId(nextConcept.id);
  };
  const handlePrev = () => {
    const prev = orderedConcepts[readingIndex - 1];
    if (prev) setSelectedId(prev.id);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setSelectedId(null); setExpandedId(null); }
      if (e.key === 'ArrowRight' && selectedId) handleNext();
      if (e.key === 'ArrowLeft' && selectedId) handlePrev();
      if (e.key === '1') setT('layoutMode', 'layered');
      if (e.key === '2') setT('layoutMode', 'radial');
      if (e.key === '3') setT('layoutMode', 'swimlanes');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, readingIndex]);

  const layoutMeta = {
    layered: { title: 'Layered Flowchart', subtitle: 'Entry → features → services → data. Read top-down.' },
    radial: { title: 'Radial Constellation', subtitle: 'Entry at the core. Categories radiate out by layer.' },
    swimlanes: { title: 'Swim Lanes', subtitle: 'Horizontal bands by layer. Read left to right within each.' },
  };
  const meta = layoutMeta[t.layoutMode] || layoutMeta.layered;

  return (
    <div className="app">
      <TopBar title="sample-instagram-clone" meta={meta}
        readingIndex={readingIndex} total={orderedConcepts.length}
        onFit={() => { setSelectedId(null); }} />

      <div className="stage" ref={stageRef}>
        <Graph
          stageSize={viewSize}
          layout={layout}
          layoutKind={layout.layoutKind}
          selectedId={selectedId}
          nextId={nextId}
          highlightNext={t.highlightNext}
          expandedId={expandedId}
          onSelect={setSelectedId}
          onExpand={handleExpand}
          tweaks={t}
        />

        {selectedConcept && (
          <Inspector
            concept={selectedConcept}
            readingIndex={readingIndex}
            totalConcepts={orderedConcepts.length}
            hasSubs={!!SUB_CONCEPTS[selectedConcept.id]}
            isExpanded={expandedId === selectedConcept.id}
            onClose={() => setSelectedId(null)}
            onNext={handleNext}
            onPrev={handlePrev}
            onExpand={() => handleExpand(selectedConcept.id)}
          />
        )}

        {/* Empty-state hint */}
        {!selectedId && t.highlightNext && (
          <div className="next-hint">
            <div className="next-hint-dot" />
            <span>Tap the pulsing node to start, or press <kbd>→</kbd></span>
          </div>
        )}
      </div>

      <TweaksPanel>
        <TweakSection label="Layout" />
        <TweakRadio label="Arrangement" value={t.layoutMode}
          options={[
            { value: 'layered', label: 'Layered' },
            { value: 'radial', label: 'Radial' },
            { value: 'swimlanes', label: 'Lanes' },
          ]}
          onChange={(v) => setT('layoutMode', v)} />
        <TweakSection label="Reading cues" />
        <TweakToggle label="Numbered order" value={t.readingOrder}
          onChange={(v) => setT('readingOrder', v)} />
        <TweakToggle label="Pulse next node" value={t.highlightNext}
          onChange={(v) => setT('highlightNext', v)} />
        <TweakSection label="Detail" />
        <TweakToggle label="Edge labels" value={t.edgeLabels}
          onChange={(v) => setT('edgeLabels', v)} />
        <TweakToggle label="File counts" value={t.fileCount}
          onChange={(v) => setT('fileCount', v)} />
        <TweakToggle label="Layer guides" value={t.showLayerGuides}
          onChange={(v) => setT('showLayerGuides', v)} />
      </TweaksPanel>
    </div>
  );
}

function TopBar({ title, meta, readingIndex, total, onFit }) {
  const explored = Math.max(0, readingIndex + 1);
  const pct = Math.round((explored / total) * 100);
  return (
    <header className="topbar">
      <div className="tb-left">
        <div className="tb-home">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 7l6-5 6 5v8a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </div>
        <div>
          <div className="tb-title">{title}</div>
          <div className="tb-sub">{meta.title} — {meta.subtitle}</div>
        </div>
      </div>
      <div className="tb-progress" title={`${pct}% explored`}>
        <div className="tb-progress-label">{pct}% explored</div>
        <div className="tb-progress-bar"><div className="tb-progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="tb-right">
        <button className="tb-btn">Share</button>
        <button className="tb-btn primary">Profile</button>
      </div>
    </header>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
