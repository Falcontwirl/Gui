// graph.jsx — SVG-based graph renderer.
// Why SVG over Canvas here: edges need path animation, blur filters, and
// event targeting that SVG gives us for free. Node count is small (<50)
// so we don't need canvas performance.

const { useViewport } = window;

function Graph({ layout, layoutKind, selectedId, onSelect, onExpand, expandedId, highlightNext, nextId, tweaks, stageSize }) {
  const containerRef = React.useRef(null);
  const [localSize, setLocalSize] = React.useState(null);

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      const r = containerRef.current.getBoundingClientRect();
      setLocalSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Prefer the stage-owned size (same source as the layout contentBox)
  const size = stageSize && stageSize.w > 0 ? stageSize : (localSize || { w: 0, h: 0 });

  const { transform, fitToView, zoomAt, zoomTo, minScale, maxScale, handlers } = useViewport({
    contentBox: layout.contentBox,
    viewportSize: size,
    minScaleMode: 'fit',
    maxScale: 2.5,
    padding: 60,
  });

  const selectedNode = layout.nodes.find(n => n.id === selectedId);
  const nextNode = layout.nodes.find(n => n.id === nextId);

  // Focus transform: when a node is selected, zoom toward it
  const prevSelectedRef = React.useRef(null);
  React.useEffect(() => {
    if (selectedId && selectedId !== prevSelectedRef.current) {
      const node = layout.nodes.find(n => n.id === selectedId);
      if (node) {
        const targetK = Math.min(1.4, Math.max(minScale * 1.3, 1.1));
        zoomTo(node.x, node.y, targetK);
      }
    } else if (!selectedId && prevSelectedRef.current) {
      fitToView(true);
    }
    prevSelectedRef.current = selectedId;
  }, [selectedId, layout.nodes, zoomTo, fitToView, minScale]);

  // Build adjacency for highlighting
  const adj = React.useMemo(() => {
    const m = new Map();
    layout.edges.forEach(e => {
      if (!m.has(e.source)) m.set(e.source, new Set());
      if (!m.has(e.target)) m.set(e.target, new Set());
      m.get(e.source).add(e.target);
      m.get(e.target).add(e.source);
    });
    return m;
  }, [layout.edges]);

  const connectedIds = React.useMemo(() => {
    if (!selectedId) return null;
    const set = new Set([selectedId]);
    (adj.get(selectedId) || new Set()).forEach(id => set.add(id));
    return set;
  }, [selectedId, adj]);

  const nodeById = React.useMemo(() => {
    const m = new Map();
    layout.nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [layout.nodes]);

  // Time loop for animations (next-node pulse, edge dashes)
  const [time, setTime] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const start = performance.now();
    const loop = () => {
      setTime(performance.now() - start);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onBgDoubleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    // If zoomed out, zoom in; else fit
    if (transform.k < 1.2) zoomAt(sx, sy, 1.6);
    else fitToView(true);
  };

  return (
    <div ref={containerRef} className="graph-root" onDoubleClick={onBgDoubleClick}
      onWheel={handlers.onWheel} onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove} onPointerUp={(e) => {
        const r = handlers.onPointerUp(e);
        if (r && !r.moved) onSelect(null); // click on empty bg clears
      }}>

      <svg width={size.w} height={size.h} style={{ display: 'block' }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" opacity="0.6" />
          </marker>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Background: bands or rings */}
          {layoutKind === 'swimlanes' && <SwimLaneBackground lanes={layout.lanes} contentBox={layout.contentBox} />}
          {layoutKind === 'radial' && <RadialBackground rings={layout.rings} />}
          {layoutKind === 'layered' && tweaks.showLayerGuides && <LayerGuides bands={layout.bands} contentBox={layout.contentBox} />}

          {/* Edges (under nodes) */}
          <g className="edges-layer">
            {layout.edges.map((e, i) => {
              const a = nodeById.get(e.source);
              const b = nodeById.get(e.target);
              if (!a || !b) return null;
              const isHighlighted = connectedIds
                ? (connectedIds.has(e.source) && connectedIds.has(e.target))
                : false;
              const isDimmed = selectedId && !isHighlighted;
              const color = CONCEPT_COLORS[a.color]?.accent || '#857D6A';
              return (
                <Edge key={i} a={a} b={b} label={e.label} layoutKind={layoutKind}
                  cx={layout.contentBox.w / 2} cy={layout.contentBox.h / 2}
                  color={color} highlight={isHighlighted} dimmed={isDimmed}
                  showLabel={tweaks.edgeLabels} time={time} scale={transform.k} />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes-layer">
            {layout.nodes.map(n => {
              const isSelected = selectedId === n.id;
              const isConnected = connectedIds ? connectedIds.has(n.id) : true;
              const isDimmed = selectedId && !isConnected;
              const isNext = nextId === n.id && highlightNext && !selectedId;
              const isExpanded = expandedId === n.id;
              return (
                <Node key={n.id} node={n} selected={isSelected} dimmed={isDimmed}
                  isNext={isNext} isExpanded={isExpanded} time={time}
                  scale={transform.k}
                  showOrder={tweaks.readingOrder}
                  showFileCount={tweaks.fileCount}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(n.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (SUB_CONCEPTS[n.id]) onExpand(n.id);
                  }} />
              );
            })}
          </g>
        </g>
      </svg>

      <ViewportControls scale={transform.k} minScale={minScale} maxScale={maxScale}
        onFit={() => { onSelect(null); fitToView(true); }}
        onZoomIn={() => zoomAt(size.w / 2, size.h / 2, 1.3)}
        onZoomOut={() => zoomAt(size.w / 2, size.h / 2, 1 / 1.3)} />
    </div>
  );
}

// ----- Background decorations ---------------------------------------------
function SwimLaneBackground({ lanes, contentBox }) {
  if (!lanes) return null;
  return (
    <g className="lanes">
      {lanes.map((l, i) => {
        const color = CONCEPT_COLORS[l.color];
        return (
          <g key={l.key}>
            <rect x={40} y={l.y} width={contentBox.w - 80} height={l.height}
              fill={color?.accent || '#857D6A'} fillOpacity={0.05}
              stroke={color?.accent || '#857D6A'} strokeOpacity={0.18} strokeWidth={1}
              strokeDasharray="2 4" rx={12} />
            <text x={68} y={l.centerY} dominantBaseline="middle" textAnchor="start"
              className="lane-label" style={{ fill: color?.accent || '#857D6A' }}>
              {l.label.toUpperCase()}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function RadialBackground({ rings }) {
  if (!rings) return null;
  return (
    <g className="rings">
      {rings.map((r, i) => (
        <circle key={i} cx={r.cx} cy={r.cy} r={r.r}
          fill="none" stroke="#857D6A" strokeOpacity={0.14}
          strokeWidth={1} strokeDasharray="3 5" />
      ))}
    </g>
  );
}

function LayerGuides({ bands, contentBox }) {
  if (!bands) return null;
  return (
    <g className="layer-guides">
      {bands.map((b, i) => (
        <line key={i} x1={30} y1={b.y} x2={contentBox.w - 30} y2={b.y}
          stroke="#857D6A" strokeOpacity={0.08} strokeWidth={1} strokeDasharray="1 6" />
      ))}
    </g>
  );
}

// ----- Edge ----------------------------------------------------------------
function Edge({ a, b, label, layoutKind, cx, cy, color, highlight, dimmed, showLabel, time, scale }) {
  const d = React.useMemo(() => {
    if (layoutKind === 'radial') {
      return routeRadialEdge(a, b, cx, cy);
    }
    const pts = routeOrthogonalEdge(a, b);
    return pathFromPoints(pts, 14);
  }, [a.x, a.y, b.x, b.y, layoutKind, cx, cy]);

  const opacity = dimmed ? 0.08 : (highlight ? 0.78 : 0.22);
  const strokeW = highlight ? 2 : 1.2;

  // Midpoint for label (approximate — use Z or curve midpoint)
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;

  // Animated dash for highlighted edges
  const dashOffset = highlight ? -(time / 40) : 0;

  return (
    <g className="edge" style={{ pointerEvents: 'none' }}>
      <path d={d} fill="none"
        stroke={color} strokeOpacity={opacity} strokeWidth={strokeW / scale * scale}
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={highlight ? '6 4' : 'none'}
        strokeDashoffset={dashOffset}
        markerEnd="url(#arrow)"
        style={{ color }} />
      {showLabel && label && (highlight || (!dimmed && scale > 0.7)) && (
        <g transform={`translate(${midX},${midY})`}>
          <rect x={-label.length * 3.1 - 6} y={-8} width={label.length * 6.2 + 12} height={16}
            rx={8} fill="var(--bg)" opacity={0.92} />
          <text x={0} y={3} textAnchor="middle" className="edge-label"
            style={{ fill: color, opacity: highlight ? 1 : 0.7 }}>{label}</text>
        </g>
      )}
    </g>
  );
}

// ----- Node ----------------------------------------------------------------
function Node({ node, selected, dimmed, isNext, isExpanded, time, scale, onClick, onDoubleClick, showOrder, showFileCount }) {
  const colors = CONCEPT_COLORS[node.color] || CONCEPT_COLORS.gray;
  const r = node.r;
  const drawR = selected ? r * 1.06 : r;

  const pulse = isNext ? (1 + Math.sin(time / 500) * 0.08) : 1;
  const pulseR = drawR * pulse;
  const pulseOpacity = isNext ? (0.4 + Math.sin(time / 500) * 0.25) : 0;

  const opacity = dimmed ? 0.28 : 1;
  const hasSubs = !!SUB_CONCEPTS[node.id];

  return (
    <g className="node" transform={`translate(${node.x},${node.y})`}
      style={{ opacity, cursor: 'pointer' }}
      onClick={onClick} onDoubleClick={onDoubleClick}>

      {/* Next-up pulse halo */}
      {isNext && (
        <>
          <circle r={pulseR + 14} fill={colors.accent} opacity={pulseOpacity * 0.4} />
          <circle r={pulseR + 6} fill="none" stroke={colors.accent} strokeOpacity={0.5} strokeWidth={2}
            strokeDasharray="3 3" style={{ transformOrigin: 'center' }} />
        </>
      )}

      {/* Selected glow */}
      {selected && (
        <circle r={drawR + 10} fill="none" stroke={colors.accent} strokeOpacity={0.35} strokeWidth={3} />
      )}

      {/* Soft drop shadow */}
      <circle r={drawR} fill="rgba(0,0,0,0.1)" transform="translate(0,3)" filter="url(#softGlow)" opacity={0.4} />

      {/* Main body */}
      <circle r={drawR} fill={colors.fill} stroke={colors.accent} strokeWidth={selected ? 2.5 : 1.5} />

      {/* Reading order badge */}
      {showOrder && (
        <g transform={`translate(${-drawR + 6}, ${-drawR + 6})`}>
          <circle r={13} fill={colors.accent} stroke="var(--bg)" strokeWidth={2} />
          <text y={4} textAnchor="middle" className="order-badge">{node.order}</text>
        </g>
      )}

      {/* Expand indicator */}
      {hasSubs && !isExpanded && (
        <g transform={`translate(${drawR - 4}, ${drawR - 4})`}>
          <circle r={10} fill="var(--bg)" stroke={colors.accent} strokeWidth={1.5} />
          <line x1={-4} y1={0} x2={4} y2={0} stroke={colors.accent} strokeWidth={1.8} strokeLinecap="round" />
          <line x1={0} y1={-4} x2={0} y2={4} stroke={colors.accent} strokeWidth={1.8} strokeLinecap="round" />
        </g>
      )}

      {/* Name label below */}
      <text y={drawR + 20} textAnchor="middle" className="node-label"
        style={{ fill: colors.text }}>
        {node.name}
      </text>

      {/* File count */}
      {showFileCount && (
        <text y={drawR + 36} textAnchor="middle" className="node-sublabel">
          {node.fileCount} files
        </text>
      )}
    </g>
  );
}

// ----- Viewport controls --------------------------------------------------
function ViewportControls({ scale, minScale, maxScale, onFit, onZoomIn, onZoomOut }) {
  const pct = Math.round((scale - minScale) / (maxScale - minScale) * 100);
  return (
    <div className="viewport-controls">
      <button onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      <div className="zoom-track">
        <div className="zoom-fill" style={{ height: `${Math.max(4, Math.min(100, pct))}%` }} />
      </div>
      <button onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      <div className="vc-divider" />
      <button onClick={onFit} aria-label="Fit to view" title="Fit to view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

window.Graph = Graph;
