// Swim-lane layout — concepts organized into labeled horizontal bands by
// architectural layer, with left-to-right reading order within each band.
// Dynamic sizing ensures labels never overlap. Batch edge routing prevents crossing.

const CHAR_WIDTH = 7.5; // estimated width per character at 12.5px Inter
const MIN_NODE_GAP = 40; // minimum px between node edges (not centers)

export function nodeRadius(c, expansions) {
  const byImportance = { critical: 50, important: 42, supporting: 34 };
  const base = byImportance[c.importance] || 38;
  const r = base + Math.min(8, (c.fileCount || 0) * 0.6);
  if (c._expanded && c._subConcepts?.length) {
    const subCount = c._subConcepts.length;
    let depthExtra = 0;
    if (expansions) {
      for (const sc of c._subConcepts) {
        if (expansions[sc.id]?.subConcepts?.length) depthExtra += 25;
      }
    }
    return r + 20 + subCount * 10 + depthExtra;
  }
  return r;
}

function estimateLabelWidth(name) {
  return (name?.length || 0) * CHAR_WIDTH;
}

function nodeFootprint(c, expansions) {
  const r = nodeRadius(c, expansions);
  return Math.max(r * 2, estimateLabelWidth(c.name));
}

export function layoutSwimLanes(concepts, edges, viewW, viewH, expansions) {
  const PAD_TOP = 90;
  const PAD_BOT = 80;
  const PAD_L = 200;
  const PAD_R = 120;

  const byLayer = {};
  concepts.forEach(c => {
    const layer = c.layer ?? 0;
    if (!byLayer[layer]) byLayer[layer] = [];
    byLayer[layer].push(c);
  });
  const layerKeys = Object.keys(byLayer).map(Number).sort((a, b) => a - b);
  layerKeys.forEach(k => byLayer[k].sort((a, b) => (a._order || 0) - (b._order || 0)));

  const laneCount = Math.max(1, layerKeys.length);

  // Compute minimum required width based on label/node sizes per lane
  let maxLaneContentW = 0;
  layerKeys.forEach(k => {
    const band = byLayer[k];
    const totalFootprint = band.reduce((sum, c) => sum + nodeFootprint(c, expansions), 0);
    const gaps = Math.max(0, band.length - 1) * MIN_NODE_GAP;
    maxLaneContentW = Math.max(maxLaneContentW, totalFootprint + gaps);
  });

  // Compute minimum lane height based on largest node in each lane
  let maxRadiusAcrossLanes = 50;
  layerKeys.forEach(k => {
    byLayer[k].forEach(c => {
      maxRadiusAcrossLanes = Math.max(maxRadiusAcrossLanes, nodeRadius(c, expansions));
    });
  });
  const minLaneH = maxRadiusAcrossLanes * 2 + 80;

  const W = Math.max(viewW, maxLaneContentW + PAD_L + PAD_R);
  const H = Math.max(viewH, PAD_TOP + PAD_BOT + laneCount * minLaneH);

  const innerH = H - PAD_TOP - PAD_BOT;
  const innerW = W - PAD_L - PAD_R;
  const laneHeight = innerH / laneCount;

  const laneLabels = {
    0: 'Entry Point',
    1: 'Features',
    2: 'Services',
    3: 'Data Layer',
  };

  const nodes = [];
  const lanes = [];
  layerKeys.forEach((k, laneIdx) => {
    const band = byLayer[k];
    const laneY = PAD_TOP + laneHeight * laneIdx;
    const laneCY = laneY + laneHeight / 2;
    lanes.push({
      key: k,
      label: laneLabels[k] || `Layer ${k}`,
      color: band[0]?.color || 'gray',
      y: laneY,
      height: laneHeight,
      centerY: laneCY,
    });

    const cols = band.length;
    const radii = band.map(c => nodeRadius(c, expansions));
    const maxR = Math.max(...radii);

    // Determine if we need Y-stagger to avoid label overlap
    const avgSpacing = cols > 1 ? innerW / (cols - 1) : innerW;
    const needsStagger = cols > 3 && avgSpacing < maxR * 2 + 80;
    const staggerAmt = needsStagger
      ? Math.min(24, laneHeight / 2 - maxR - 36)
      : 0;

    band.forEach((c, colIdx) => {
      const x = PAD_L + (cols === 1 ? innerW / 2 : (innerW * colIdx) / (cols - 1));
      const yOffset = staggerAmt > 0 ? (colIdx % 2 === 0 ? -staggerAmt : staggerAmt) : 0;
      nodes.push({
        ...c,
        x,
        y: laneCY + yOffset,
        r: nodeRadius(c, expansions),
        _laneIdx: laneIdx,
      });
    });
  });

  return {
    nodes,
    edges: edges.map(e => ({ ...e })),
    lanes,
    contentBox: { x: 0, y: 0, w: W, h: H },
  };
}

// --- Batch edge routing with offset to prevent stacking ---

function routeSingleEdge(a, b, offset = 0) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let sx, sy, tx, ty;
  const verticalDominant = absDy > absDx * 0.8;

  if (verticalDominant) {
    sx = a.x;
    sy = a.y + Math.sign(dy) * a.r;
    tx = b.x;
    ty = b.y - Math.sign(dy) * b.r;
  } else {
    sx = a.x + Math.sign(dx) * a.r;
    sy = a.y;
    tx = b.x - Math.sign(dx) * b.r;
    ty = b.y;
  }

  const midY = (sy + ty) / 2 + offset;
  const midX = (sx + tx) / 2 + offset;

  if (verticalDominant) {
    return [
      { x: sx, y: sy },
      { x: sx, y: midY },
      { x: tx, y: midY },
      { x: tx, y: ty },
    ];
  }
  return [
    { x: sx, y: sy },
    { x: midX, y: sy },
    { x: midX, y: ty },
    { x: tx, y: ty },
  ];
}

export function routeAllEdges(edges, nodesById) {
  // Group edges by lane pair to offset parallel routes
  const groups = {};
  const edgeData = edges.map(e => {
    const a = nodesById.get(e.source);
    const b = nodesById.get(e.target);
    if (!a || !b) return null;
    const key = `${Math.min(a._laneIdx, b._laneIdx)}-${Math.max(a._laneIdx, b._laneIdx)}`;
    if (!groups[key]) groups[key] = [];
    const entry = { edge: e, a, b, key };
    groups[key].push(entry);
    return entry;
  }).filter(Boolean);

  // Assign offset index within each group
  Object.values(groups).forEach(group => {
    group.sort((x, y) => x.a.x - y.a.x);
    group.forEach((entry, idx) => {
      entry.offsetIdx = idx;
      entry.groupSize = group.length;
    });
  });

  const EDGE_SPACING = 14;
  return edgeData.map(({ edge, a, b, offsetIdx, groupSize }) => {
    const offset = (offsetIdx - (groupSize - 1) / 2) * EDGE_SPACING;
    const points = routeSingleEdge(a, b, offset);
    return { edge, points, a, b };
  });
}

// Keep for backward compat — but prefer routeAllEdges for batch routing
export function routeOrthogonalEdge(a, b) {
  return routeSingleEdge(a, b, 0);
}

export function pathFromPoints(points, cornerR = 14) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2)
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];

    const d1x = cur.x - prev.x;
    const d1y = cur.y - prev.y;
    const d2x = next.x - cur.x;
    const d2y = next.y - cur.y;
    const l1 = Math.hypot(d1x, d1y);
    const l2 = Math.hypot(d2x, d2y);
    const r = Math.min(cornerR, l1 / 2, l2 / 2);
    if (r < 1) {
      d += ` L${cur.x},${cur.y}`;
      continue;
    }
    const p1 = { x: cur.x - (d1x / l1) * r, y: cur.y - (d1y / l1) * r };
    const p2 = { x: cur.x + (d2x / l2) * r, y: cur.y + (d2y / l2) * r };
    d += ` L${p1.x},${p1.y} Q${cur.x},${cur.y} ${p2.x},${p2.y}`;
  }
  const last = points[points.length - 1];
  d += ` L${last.x},${last.y}`;
  return d;
}
