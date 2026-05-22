# Handoff: Codebase Explorer — Graph Redesign (Swim Lanes)

## Overview

This package redesigns the main graph view of Codebase Explorer. The old force-directed layout produced a visually noisy, hierarchy-less cloud of bubbles with edges cutting through nodes and unbounded jittery zoom. The new design organizes concepts into **labeled horizontal swim lanes** by architectural role, with an explicit left-to-right reading order, orthogonal edge routing, and a clamped/smooth viewport.

## About the Design Files

The files in `prototype/` are **design references created in HTML**. They are a runnable, interactive prototype showing the intended look, layout, behavior, and interactions — **not production code to drop into the existing `CodebaseExplorer/` codebase verbatim**.

Your job is to **recreate these designs inside the existing Vite + React app** (`CodebaseExplorer/src/components/GraphCanvas.jsx` and neighbors), replacing the current `d3-force` layout and Canvas renderer with the swim-lane layout, SVG edge routing, and new viewport model demonstrated here — while reusing the existing Zustand store, `CONCEPT_COLORS` palette, `canvasIcons`, inspector panel, and chat integrations.

## Fidelity

**High-fidelity.** Colors, typography, spacing, node radii, edge routing, and animation timings are all finalized. Hex values, font stacks, and exact pixel measurements are documented below. Match them precisely.

## Chosen Direction

The prototype ships three variants (layered / radial / lanes) selectable via the Tweaks panel. **The user has locked in `swimlanes` as the final direction** — you can delete the other two layout functions if you want, or leave them behind as future options.

## Screen: Main Graph View (Swim Lanes)

### Purpose

A user uploads a codebase. The app shows every top-level concept organized into horizontal bands, with a clear numbered reading order. Users can click any concept to see its description, walk the reading order with Prev / Next, or expand a concept to reveal its sub-concepts in place.

### Layout (top → bottom)

1. **Top bar** — 60px tall, full width, 1px bottom border `rgba(41,38,27,0.08)`
   - Left: 36×36 home icon tile + project name (14px/600) + layout description (11.5px, `--ink-3`)
   - Center: progress track (260px max width) — "N% explored" label + 4px gradient fill bar (`#9A6B78 → #6E8A6A`)
   - Right: Share + Profile buttons (7×14 padding, 8px radius)

2. **Stage** — fills remaining height. Background:
   ```css
   background:
     radial-gradient(circle at 30% 20%, rgba(154,107,120,0.04), transparent 50%),
     radial-gradient(circle at 80% 70%, rgba(110,138,106,0.05), transparent 55%),
     #F3EEEA;
   ```

3. **Graph SVG** — fills the stage. Contains lane backgrounds, edges, and nodes in z-order.

4. **Inspector** (when a node is selected) — floats top-right of the stage, 340px wide, 14px inset, glass effect.

5. **Viewport controls** — floats bottom-left of the stage, vertical stack: zoom-in, zoom track (shows current position in min→max range), zoom-out, divider, fit-to-view.

6. **Next-up hint pill** (when no node selected) — centered bottom, a small pulsing-dot pill: "Tap the pulsing node to start, or press →"

7. **Tweaks panel** — bottom right, provided by `tweaks-panel.jsx` host component. Shows Layout (Lanes selected), Reading cues, Detail toggles.

### Swim Lanes

Four horizontal bands, each full viewport width with 40px horizontal inset:
- **Entry Point** (top)
- **Features**
- **Services**
- **Data Layer** (bottom)

Each lane:
- Height = `innerH / laneCount`
- Background: its layer's accent color at 5% opacity
- Border: 1px dashed (`2 4` pattern) same accent at 18% opacity, 12px radius
- Label: top-left of lane, 10px/700 uppercase, 0.12em letter-spacing, 70% opacity accent color

Left padding = 160px (room for the label), right padding = 80px.

### Nodes

Circle nodes sized by `importance`:

| Importance | Base radius | File count bonus |
|---|---|---|
| `critical` | 50px | + `min(8, fileCount * 0.6)` |
| `important` | 42px | same |
| `supporting` | 34px | same |

**Fill:** `CONCEPT_COLORS[color].fill` (the existing palette).
**Stroke:** `CONCEPT_COLORS[color].accent`, 1.5px normally, 2.5px when selected.
**Drop shadow:** a blurred darker circle offset `(0, 3)`, 40% opacity, behind the main circle.

**Reading-order badge** (top-left of node):
- 13px radius filled with `accent`, 2px `--bg` ring
- Center digit: 11px/700, filled `--bg`

**Expand affordance** (bottom-right of node, only if sub-concepts exist):
- 10px radius `--bg` fill, 1.5px `accent` ring
- Plus icon (1.8px strokes)

**Next-up pulse** (only one node at a time, when no node is selected):
- Halo: `accent` color, radius `drawR + 14`, opacity oscillates 0.15 ↔ 0.65 on a 500ms sine
- Ring: dashed `3 3` at `drawR + 6`

**Selected state:**
- Radius 1.06× normal
- Extra ring at `drawR + 10`, 3px stroke, accent at 35% opacity

**Dimmed state** (another node selected, not a neighbor): opacity 0.28.

**Name label** below the node: 12.5px/600 Inter, filled with `accent.text`, with a 3px `--bg` paint-order stroke so it reads over edges.
**File count** below name: 10px, `--ink-3`, same paint-order stroke.

### Edges

- **Routing:** orthogonal (L- or Z-shape), entering/exiting on node perimeter aligned with the travel axis. See `routeOrthogonalEdge()` in `layouts.js`.
- **Corners:** rounded with `cornerR = 14` via `pathFromPoints()`.
- **Arrowhead:** triangle marker at target end, 6×6, `currentColor` at 60% opacity.
- **Base opacity:** 0.22, 1.2px stroke.
- **Highlighted** (when either endpoint is selected): 0.78 opacity, 2px stroke, animated dashed `6 4` pattern with `stroke-dashoffset` animating at `-time/40`.
- **Dimmed:** 0.08 opacity.
- **Labels:** 9.5px/500 Inter, shown on hover or when selected. White pill background (`var(--bg)` @ 92% opacity) with 8px radius, 12px horizontal padding.

### Inspector Panel

Position: `top: 14px; right: 14px`. Width 340px. Glass: `rgba(251,248,244,0.96)` + `backdrop-filter: blur(18px) saturate(160%)`. 16px radius, `--shadow-md`.

Enter animation: 220ms `cubic-bezier(0.2, 0.8, 0.2, 1)` — fade + 8px slide from top + 0.98→1 scale.

Content:
1. **Head row:** order chip (22×22, accent, white digit) + "Step N of M" (11px `--ink-3`), then close button (26×26, `--ink-3` X icon).
2. **Title:** 20px/600, tight letter-spacing `-0.01em`, filled with `accent.text`.
3. **Meta:** importance chip (`accent.fill` bg, `accent.text` color, 10.5px/600 pill) + "N files" (11.5px `--ink-3`).
4. **Summary:** 13.5px/1.55 `--ink-2`, `text-wrap: pretty`.
5. **Expand button** (if sub-concepts exist): 1.5px dashed `accent` border, transparent bg, `+` or `−` icon + label.
6. **Divider:** 1px `--line`, full-bleed (-20px margins).
7. **Nav row:** Previous (neutral `--card`) + Next (primary, filled with `accent`, flex: 1.4). 9×12 padding, 8px radius, disabled at 35% opacity when at ends.

### Viewport Controls

Position: `left: 16px; bottom: 16px`. Glass chip (`rgba(251,248,244,0.86)` + blur 16). 12px radius.

Vertical stack: Zoom-in (+) → 2×44 vertical track with `--ink-2` fill showing current zoom in min→max range → Zoom-out (−) → 1px divider → Fit-to-view (4-corner icon).

## Interactions & Behavior

### Selection

- **Click** a node → select it. Inspector slides in. Connected edges + neighbors highlight; everything else dims.
- **Click empty space** → deselect. Inspector unmounts.
- **Double-click** a node with sub-concepts → expand (inject sub-concepts into layout).
- **Double-click** the stage → zoom 1.6× at cursor (or fit-to-view if already zoomed).
- **Escape** → deselect + collapse any expansion.
- **Arrow Right / Left** (with selection) → walk reading order via Inspector nav.

### Viewport

- **Wheel (vertical):** zoom toward cursor. `scale *= exp(-deltaY * 0.002)`.
- **Pinch (ctrl/cmd + wheel):** zoom toward cursor. `scale *= exp(-deltaY * 0.01)`.
- **Shift + wheel / horizontal wheel:** pan.
- **Drag:** pan with momentum on release (velocity × 0.92 per frame friction).
- **Clamps:**
  - `minScale = fit` (whole graph fills viewport with 60px padding — user cannot zoom out further than the full picture).
  - `maxScale = 2.5`.
  - Pan is clamped so content can't be dragged fully off-screen.
- **Smoothing:** on every animation frame, current transform lerps toward target transform with factor 0.22 (exponential ease, frame-rate independent feel).
- **Zoom-to-node:** selecting a node animates zoom to `max(minScale * 1.3, 1.1)` but capped at `1.4`.
- **Fit-to-view:** recomputes a transform where graph exactly fills `viewport - 2*padding`.

### Reading order & pulse

- Concepts are numbered 1..N by their `order` property.
- When **no** node is selected, the first node in the reading order pulses. After selecting node N, the pulse moves to node N+1.
- Walking via Prev/Next or arrow keys moves selection through the reading order.

### Expansion

When a concept is expanded:
1. Sub-concepts are injected into the concept list with `layer = parent.layer + 0.5` (sits between its parent's lane and the next).
2. Layout re-computes with the new set — sub-concepts get their own mini-row between lanes.
3. Parent→sub edges are drawn as "contains" edges using the same orthogonal router.
4. Clicking the +/− button in the Inspector, or double-clicking the node again, collapses.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `→` | Next concept (when one is selected) |
| `←` | Previous concept |
| `Esc` | Deselect / collapse |
| `1` / `2` / `3` | Switch layout (if you keep the other variants) |

## State Management

Map these onto the existing Zustand store (`src/store/useStore.js`). Most pieces already exist:

| State | Notes |
|---|---|
| `concepts` | Already exists. Add a canonical `order` number derived from tour order. |
| `selectedNode` | Already exists. |
| `expansions` | Already exists — the swim-lane layout just needs to receive these injected as additional concepts with `layer = parent.layer + 0.5`. |
| `viewportTransform` | New: `{x, y, k}`, target + current refs (don't re-render on every frame; throttle to React state via `requestAnimationFrame`). |
| `readingOrder` | Derived selector: concepts sorted by `order`. |

The viewport math (`useViewport` hook in `viewport.jsx`) can be ported 1:1. It owns its own refs for current / target / velocity to avoid React re-renders on pan/zoom frames.

## Design Tokens

### Colors

Bring these across to `:root` in `src/index.css`:

```css
--bg: #F3EEEA;
--bg-2: #EAE3DC;
--ink: #29261b;
--ink-2: #5a544a;
--ink-3: #8a8175;
--line: rgba(41, 38, 27, 0.08);
--line-strong: rgba(41, 38, 27, 0.14);
--card: #FBF8F4;
--shadow-sm: 0 1px 2px rgba(41,38,27,0.06), 0 4px 14px rgba(41,38,27,0.06);
--shadow-md: 0 2px 6px rgba(41,38,27,0.08), 0 16px 40px rgba(41,38,27,0.12);
```

`CONCEPT_COLORS` in `src/data/sampleData.js` **stays exactly as-is** — the 8 warm-tone palette.

### Typography

- Primary: `Inter` (weights 400, 500, 600, 700) — already in use.
- Mono: `JetBrains Mono` — for file counts in the files view and `<kbd>`.
- Sizes: 10 / 10.5 / 11 / 11.5 / 12 / 12.5 / 13.5 / 14 / 20 px.
- Feature settings: `'cv02', 'cv03', 'cv04'` for Inter's refined letterforms.

### Spacing

Radii: 6, 8, 10, 12, 14, 16, 99 (pill). Gaps: 4, 6, 8, 10, 12, 14, 16, 18, 20.

### Animation timing

- Inspector in: 220ms `cubic-bezier(0.2, 0.8, 0.2, 1)`
- Next-node pulse: 500ms sine loop
- Edge dash flow: continuous, `-time/40` offset
- Zoom/pan lerp: factor 0.22 per 16ms frame
- Pan momentum friction: 0.92 per frame

## Assets

None new. Existing `canvasIcons.js` icons can still be used inside the node circles if you'd like — the prototype omits them for clarity of the reading-order badge, but they're compatible. If you keep them, place the icon at `(0, -2)` inside the circle and move the order badge to the top-left corner (already positioned this way in `graph.jsx`).

## Files

### In this handoff (`prototype/`)

- `Graph Redesign.html` — entry point, CSS tokens + typography
- `app.jsx` — top bar, tweaks wiring, state, keyboard shortcuts, layout selection
- `graph.jsx` — SVG renderer, nodes, edges, backgrounds, viewport controls
- `layouts.js` — `layoutLayered`, `layoutRadial`, **`layoutSwimLanes`** (the one you want), `routeOrthogonalEdge`, `routeRadialEdge`, `pathFromPoints`
- `viewport.jsx` — `useViewport` hook: clamped, smoothed, momentum-based pan/zoom
- `inspector.jsx` — right-side detail panel with Prev/Next nav
- `data.js` — mock concept data (swap out for real store data in the target app)
- `tweaks-panel.jsx` — standalone tweaks shell; can be removed in production

### In the target codebase to modify

- `CodebaseExplorer/src/components/GraphCanvas.jsx` — **primary target**. Replace its Canvas renderer with an SVG renderer using the lane layout. Keep the store bindings.
- `CodebaseExplorer/src/utils/graphLayout.js` — replace with the swim-lane layout. Delete `createConceptLayout`, `createFileLayout`, `expandConceptLayout`.
- `CodebaseExplorer/src/index.css` — add the new CSS variables listed above.
- `CodebaseExplorer/src/components/InspectorPanel.jsx` — restructure to match the Inspector in `prototype/inspector.jsx` (head with order chip, meta, summary, expand button, Prev/Next).
- `CodebaseExplorer/src/store/useStore.js` — add `order` to concept records (deterministic from the existing tour / importance ordering). Viewport transform state can either live here or in the hook.

## Running the Prototype

```bash
# From the directory containing Graph Redesign.html:
python3 -m http.server 8000
# Then open http://localhost:8000/Graph%20Redesign.html
```

Or just open `Graph Redesign.html` directly in a browser — it uses CDN React/Babel.

Use the Tweaks panel (bottom-right) to switch between Lanes (chosen direction), Layered, and Radial if you want to see alternates. Toggle the reading cues and detail flags to see granular variants.

## Screenshots

- `screenshots/01-swim-lanes-default.png` — default view, next-up node pulsing.
- `screenshots/02-swim-lanes-selected.png` — a node selected, connected edges highlighted, inspector visible.
