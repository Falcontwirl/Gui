// viewport.jsx — buttery-smooth pan/zoom with proper clamping.
// Uses an inertial model: target transform is lerped toward on every frame.
// Wheel zoom happens around the cursor. Pan has momentum after drag release.

function useViewport({ contentBox, viewportSize, minScaleMode = 'fit', maxScale = 2.5, padding = 60 }) {
  const [transform, setTransform] = React.useState({ x: 0, y: 0, k: 1 });
  const targetRef = React.useRef({ x: 0, y: 0, k: 1 });
  const curRef = React.useRef({ x: 0, y: 0, k: 1 });
  const velRef = React.useRef({ x: 0, y: 0 });
  const animRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const pinchRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastMoveRef = React.useRef({ x: 0, y: 0, t: performance.now() });

  // Fit-to-viewport scale
  const fitScale = React.useMemo(() => {
    if (!contentBox || !viewportSize.w || !viewportSize.h) return 1;
    const sx = (viewportSize.w - padding * 2) / contentBox.w;
    const sy = (viewportSize.h - padding * 2) / contentBox.h;
    return Math.min(sx, sy);
  }, [contentBox, viewportSize, padding]);

  const minScale = minScaleMode === 'fit' ? fitScale : 0.5;

  const clamp = React.useCallback((t) => {
    const k = Math.max(minScale, Math.min(maxScale, t.k));
    // Also clamp pan so that content always stays at least partially visible
    const cw = contentBox.w * k;
    const ch = contentBox.h * k;
    const vw = viewportSize.w;
    const vh = viewportSize.h;

    let { x, y } = t;
    // If content is smaller than viewport, center with slack; else allow edges flush
    if (cw <= vw) {
      const centerX = (vw - cw) / 2;
      const slack = (vw - cw) / 2;
      x = Math.max(centerX - slack, Math.min(centerX + slack, x));
    } else {
      x = Math.max(vw - cw - padding, Math.min(padding, x));
    }
    if (ch <= vh) {
      const centerY = (vh - ch) / 2;
      const slack = (vh - ch) / 2;
      y = Math.max(centerY - slack, Math.min(centerY + slack, y));
    } else {
      y = Math.max(vh - ch - padding, Math.min(padding, y));
    }
    return { x, y, k };
  }, [minScale, maxScale, contentBox, viewportSize, padding]);

  // Fit to viewport on mount / layout change
  const fitToView = React.useCallback((animate = true) => {
    if (!contentBox || !viewportSize.w) return;
    const k = fitScale;
    const x = (viewportSize.w - contentBox.w * k) / 2;
    const y = (viewportSize.h - contentBox.h * k) / 2;
    if (animate) {
      targetRef.current = { x, y, k };
    } else {
      curRef.current = { x, y, k };
      targetRef.current = { x, y, k };
      setTransform({ x, y, k });
    }
  }, [contentBox, viewportSize, fitScale]);

  React.useEffect(() => {
    fitToView(false);
  }, [fitScale, viewportSize.w, viewportSize.h]);

  // Animation loop: exponential ease toward target + momentum decay
  React.useEffect(() => {
    const tick = () => {
      const cur = curRef.current;
      const tgt = targetRef.current;
      const vel = velRef.current;
      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;
      const dk = tgt.k - cur.k;

      // Smoothing factor (higher = faster snap). 0.18 feels good at 60fps.
      const smooth = 0.22;
      cur.x += dx * smooth;
      cur.y += dy * smooth;
      cur.k += dk * smooth;

      // Apply pan momentum if not dragging and velocity > threshold
      if (!dragRef.current && (Math.abs(vel.x) > 0.02 || Math.abs(vel.y) > 0.02)) {
        tgt.x += vel.x;
        tgt.y += vel.y;
        vel.x *= 0.92; // friction
        vel.y *= 0.92;
        // Re-clamp target so momentum doesn't push off-bounds
        const clamped = clamp(tgt);
        tgt.x = clamped.x;
        tgt.y = clamped.y;
      }

      setTransform({ x: cur.x, y: cur.y, k: cur.k });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [clamp]);

  // Pan helpers
  const panBy = React.useCallback((dx, dy) => {
    targetRef.current = clamp({ ...targetRef.current, x: targetRef.current.x + dx, y: targetRef.current.y + dy });
  }, [clamp]);

  const zoomAt = React.useCallback((screenX, screenY, deltaK) => {
    const cur = targetRef.current;
    const newK = Math.max(minScale, Math.min(maxScale, cur.k * deltaK));
    if (newK === cur.k) return;
    // Keep the world point under (screenX, screenY) stationary
    const worldX = (screenX - cur.x) / cur.k;
    const worldY = (screenY - cur.y) / cur.k;
    const newX = screenX - worldX * newK;
    const newY = screenY - worldY * newK;
    targetRef.current = clamp({ x: newX, y: newY, k: newK });
  }, [minScale, maxScale, clamp]);

  const zoomTo = React.useCallback((worldX, worldY, k) => {
    const targetK = Math.max(minScale, Math.min(maxScale, k));
    const x = viewportSize.w / 2 - worldX * targetK;
    const y = viewportSize.h / 2 - worldY * targetK;
    targetRef.current = clamp({ x, y, k: targetK });
  }, [minScale, maxScale, clamp, viewportSize]);

  // Event handlers
  const onWheel = React.useCallback((e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      // Pinch-zoom (trackpad)
      const delta = -e.deltaY * 0.01;
      zoomAt(sx, sy, Math.exp(delta));
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5 || e.shiftKey) {
      // Horizontal / shift-wheel pan
      panBy(-e.deltaX, -e.deltaY);
    } else {
      // Vertical wheel → zoom (intuitive for a graph canvas)
      const delta = -e.deltaY * 0.002;
      zoomAt(sx, sy, Math.exp(delta));
    }
  }, [zoomAt, panBy]);

  const onPointerDown = React.useCallback((e) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTX: targetRef.current.x,
      startTY: targetRef.current.y,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: performance.now(),
      moved: false,
    };
    velRef.current = { x: 0, y: 0 };
  }, []);

  const onPointerMove = React.useCallback((e) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    const instVX = (e.clientX - d.lastX) / dt * 16;
    const instVY = (e.clientY - d.lastY) / dt * 16;
    velRef.current = { x: instVX, y: instVY };

    targetRef.current = clamp({
      ...targetRef.current,
      x: d.startTX + (e.clientX - d.startX),
      y: d.startTY + (e.clientY - d.startY),
    });

    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 4) d.moved = true;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.lastT = now;
  }, [clamp]);

  const onPointerUp = React.useCallback((e) => {
    if (!dragRef.current) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    const moved = dragRef.current.moved;
    dragRef.current = null;
    return { moved };
  }, []);

  return {
    transform,
    fitToView,
    zoomAt,
    zoomTo,
    panBy,
    minScale,
    maxScale,
    handlers: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}

window.useViewport = useViewport;
