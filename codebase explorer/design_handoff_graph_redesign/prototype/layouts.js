// layouts.js — deterministic, meaningful layouts.
// Each layout takes (concepts, edges, width, height) and returns
// { nodes: [{id, x, y, r, ...}], edges: [{source, target, ...}], meta }
// All layouts use logical (unscaled) coordinates; the viewport transforms them.

// ---------------------------------------------------------------------------
// V1 — LAYERED FLOWCHART
// Concepts sort into horizontal bands by layer. Within a band, they're
// ordered by reading order. A minimum-crossings pass swaps siblings to
// reduce edge tangles. Radii are scaled by importance + file count.
// ---------------------------------------------------------------------------
function layoutLayered(concepts, edges, W, H) {
  const PAD_X = 100;
  const PAD_Y = 90;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  // Group by layer
  const layers = {};
  concepts.forEach(c => {
    if (!layers[c.layer]) layers[c.layer] = [];
    layers[c.layer].push(c);
  });
  const layerKeys = Object.keys(layers).map(Number).sort((a, b) => a - b);

  // Sort within a layer by reading order (stable first pass)
  layerKeys.forEach(k => layers[k].sort((a, b) => a.order - b.order));

  // Simple barycenter sweep to reduce crossings — iterate twice
  const edgeMap = new Map();
  edges.forEach(e => {
    if (!edgeMap.has(e.source)) edgeMap.set(e.source, []);
    if (!edgeMap.has(e.target)) edgeMap.set(e.target, []);
    edgeMap.get(e.source).push(e.target);
    edgeMap.get(e.target).push(e.source);
  });

  for (let pass = 0; pass < 3; pass++) {
    layerKeys.forEach(k => {
      const band = layers[k];
      const neighbors = {};
      layerKeys.forEach(otherK => {
        if (otherK === k) return;
        layers[otherK].forEach((n, idx) => {
          (edgeMap.get(n.id) || []).forEach(nb => {
            if (band.find(b => b.id === nb)) {
              if (!neighbors[nb]) neighbors[nb] = [];
              neighbors[nb].push(idx / Math.max(1, layers[otherK].length - 1));
            }
          });
        });
      });
      // Keep reading order as primary, neighbors as tiebreaker
      band.sort((a, b) => {
        const baryA = neighbors[a.id] ? neighbors[a.id].reduce((s, v) => s + v, 0) / neighbors[a.id].length : 0.5;
        const baryB = neighbors[b.id] ? neighbors[b.id].reduce((s, v) => s + v, 0) / neighbors[b.id].length : 0.5;
        // Order has 10x weight → reading order dominates, barycenter breaks ties
        return (a.order - b.order) * 10 + (baryA - baryB);
      });
    });
  }

  const layerCount = layerKeys.length;
  const nodes = [];
  layerKeys.forEach((k, rowIdx) => {
    const band = layers[k];
    const y = PAD_Y + (layerCount === 1 ? innerH / 2 : (innerH * rowIdx) / (layerCount - 1));
    const cols = band.length;
    band.forEach((c, colIdx) => {
      const x = PAD_X + (cols === 1 ? innerW / 2 : (innerW * colIdx) / (cols - 1));
      nodes.push({
        ...c,
        x, y,
        r: nodeRadius(c),
        _layerIdx: rowIdx,
        _colIdx: colIdx,
      });
    });
  });

  const layerLabels = {
    0: 'Entry',
    1: 'Features',
    2: 'Services',
    3: 'Data',
  };
  const bands = layerKeys.map((k, i) => ({
    key: k,
    label: layerLabels[k] || `Layer ${k}`,
    y: PAD_Y + (layerCount === 1 ? innerH / 2 : (innerH * i) / (layerCount - 1)),
    height: (layerCount > 1 ? innerH / (layerCount - 1) : innerH) * 0.9,
  }));

  return { nodes, edges: edges.map(e => ({ ...e })), bands, contentBox: { x: 0, y: 0, w: W, h: H } };
}

// ---------------------------------------------------------------------------
// V2 — RADIAL CONSTELLATION
// Reading order 1 sits at the center. Remaining concepts placed on rings by
// layer (layer 1 inner ring, layer 3 outer ring). Within a ring, ordered
// by reading order so you sweep clockwise.
// ---------------------------------------------------------------------------
function layoutRadial(concepts, edges, W, H) {
  const cx = W / 2;
  const cy = H / 2;
  const maxR = Math.min(W, H) * 0.38;

  const sorted = [...concepts].sort((a, b) => a.order - b.order);
  const center = sorted[0];
  const outer = sorted.slice(1);

  // Group outer by layer
  const byLayer = {};
  outer.forEach(c => {
    if (!byLayer[c.layer]) byLayer[c.layer] = [];
    byLayer[c.layer].push(c);
  });
  const layerKeys = Object.keys(byLayer).map(Number).sort((a, b) => a - b);
  const layerCount = layerKeys.length;

  const nodes = [{ ...center, x: cx, y: cy, r: nodeRadius(center) * 1.15 }];

  layerKeys.forEach((k, i) => {
    const band = byLayer[k].sort((a, b) => a.order - b.order);
    const ringR = maxR * (0.35 + (0.65 * i) / Math.max(1, layerCount - 1));
    const count = band.length;
    band.forEach((c, idx) => {
      // Offset so first item is at top
      const angle = -Math.PI / 2 + (2 * Math.PI * idx) / count;
      nodes.push({
        ...c,
        x: cx + Math.cos(angle) * ringR,
        y: cy + Math.sin(angle) * ringR,
        r: nodeRadius(c),
        _ringIdx: i,
        _angle: angle,
      });
    });
  });

  const rings = layerKeys.map((k, i) => ({
    key: k,
    r: maxR * (0.35 + (0.65 * i) / Math.max(1, layerCount - 1)),
    cx, cy,
  }));

  return { nodes, edges: edges.map(e => ({ ...e })), rings, layoutKind: 'radial', contentBox: { x: 0, y: 0, w: W, h: H } };
}

// ---------------------------------------------------------------------------
// V3 — SWIM LANES
// Horizontal bands labeled with the layer name. Within a lane, reading order
// flows left-to-right. Bands have a soft colored background and a label.
// Like layered, but with explicit visual lanes.
// ---------------------------------------------------------------------------
function layoutSwimLanes(concepts, edges, W, H) {
  const PAD_TOP = 70;
  const PAD_BOT = 60;
  const PAD_L = 160;
  const PAD_R = 80;
  const innerH = H - PAD_TOP - PAD_BOT;
  const innerW = W - PAD_L - PAD_R;

  const byLayer = {};
  concepts.forEach(c => {
    if (!byLayer[c.layer]) byLayer[c.layer] = [];
    byLayer[c.layer].push(c);
  });
  const layerKeys = Object.keys(byLayer).map(Number).sort((a, b) => a - b);
  layerKeys.forEach(k => byLayer[k].sort((a, b) => a.order - b.order));

  const laneHeight = innerH / layerKeys.length;
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
    band.forEach((c, colIdx) => {
      const x = PAD_L + (cols === 1 ? innerW / 2 : (innerW * colIdx) / (cols - 1));
      nodes.push({
        ...c,
        x, y: laneCY,
        r: nodeRadius(c),
        _laneIdx: laneIdx,
      });
    });
  });

  return { nodes, edges: edges.map(e => ({ ...e })), lanes, layoutKind: 'swimlanes', contentBox: { x: 0, y: 0, w: W, h: H } };
}

// ---------------------------------------------------------------------------
// Node size by importance
// ---------------------------------------------------------------------------
function nodeRadius(c) {
  const byImportance = { critical: 50, important: 42, supporting: 34 };
  const base = byImportance[c.importance] || 38;
  return base + Math.min(8, (c.fileCount || 0) * 0.6);
}

// ---------------------------------------------------------------------------
// Orthogonal edge router
// Given source and target, return an L-shaped or Z-shaped path that
// hugs the layer grid. Entry on node boundary, not center.
// ---------------------------------------------------------------------------
function routeOrthogonalEdge(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Exit/enter points on node circumference, aligned with travel axis
  let sx, sy, tx, ty;
  // Prefer vertical routing when the layers differ meaningfully
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

  // Two-segment Z with rounded corner at midpoint
  const midY = (sy + ty) / 2;
  const midX = (sx + tx) / 2;

  let path;
  if (verticalDominant) {
    // down → across → down
    path = [
      { x: sx, y: sy },
      { x: sx, y: midY },
      { x: tx, y: midY },
      { x: tx, y: ty },
    ];
  } else {
    // across → down → across
    path = [
      { x: sx, y: sy },
      { x: midX, y: sy },
      { x: midX, y: ty },
      { x: tx, y: ty },
    ];
  }

  return path;
}

// SVG-like path string for a rounded-corner polyline
function pathFromPoints(points, cornerR = 10) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

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

// Curved edge (Bezier) for radial layout — bends toward center
function routeRadialEdge(a, b, cx, cy) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Control point pulled toward the center
  const tuck = 0.35;
  const ctrlX = mx + (cx - mx) * tuck;
  const ctrlY = my + (cy - my) * tuck;

  // Start/end on node perimeter
  const ang1 = Math.atan2(ctrlY - a.y, ctrlX - a.x);
  const ang2 = Math.atan2(ctrlY - b.y, ctrlX - b.x);
  const sx = a.x + Math.cos(ang1) * a.r;
  const sy = a.y + Math.sin(ang1) * a.r;
  const tx = b.x + Math.cos(ang2) * b.r;
  const ty = b.y + Math.sin(ang2) * b.r;

  return `M${sx},${sy} Q${ctrlX},${ctrlY} ${tx},${ty}`;
}

window.layoutLayered = layoutLayered;
window.layoutRadial = layoutRadial;
window.layoutSwimLanes = layoutSwimLanes;
window.routeOrthogonalEdge = routeOrthogonalEdge;
window.routeRadialEdge = routeRadialEdge;
window.pathFromPoints = pathFromPoints;
