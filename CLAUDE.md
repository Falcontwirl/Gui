# CLAUDE.md — Design & Engineering Standards

## Design Philosophy

You are building software that looks like it was designed by a human with good taste — not by an AI. Every UI decision should feel intentional. When in doubt, look at how Linear, Raycast, Vercel, or Stripe design their interfaces and aim for that level of polish.

Before writing any UI code, stop and ask yourself: "Would I be embarrassed to show this to a designer?" If yes, rethink.

---

## Visual Taste — Hard Rules

### Never Do These
- **No emojis as icons.** Ever. Use Lucide React (`lucide-react`) for all icons. Consistent 1.5px stroke weight, sized contextually (16px inline, 20px in nav, 24px in feature blocks).
- **No pure black backgrounds.** Use deep navy/charcoal tones: `#0a0a14`, `#0d0f1a`, `#111318`. Pure `#000` is harsh and flat.
- **No gray-on-gray low-contrast UI.** Every surface layer must have enough contrast to be visually distinct from the layer beneath it. If you squint and two things merge, fix it.
- **No walls of text.** If a description is longer than 2 sentences, collapse it. Use progressive disclosure — summary first, details on demand.
- **No unstyled toggles or tabs.** Segmented controls, pill toggles, and tabs must have a visible active indicator (filled background, sliding highlight, or underline with transition). Never just bold text or a color change alone.
- **No static data visualizations.** If it's a graph, chart, or map, it must respond to interaction — zoom, pan, hover highlights, click-to-focus. Static = broken.
- **No same-size-everything.** Visual hierarchy means size encodes importance. Nodes, cards, text — scale them proportionally to their significance.

### Always Do These
- **Spacing is generous.** Minimum 16px between related elements, 24px+ between sections. `line-height: 1.6` for body text. When it feels like enough space, add a little more.
- **Surfaces have depth.** Use layered backgrounds (base → surface → elevated) with subtle box-shadows and/or border (`1px solid rgba(255,255,255,0.06)`) to separate planes. Sidebar ≠ background color.
- **Color is purposeful.** Choose 5–7 accent colors from a cohesive palette. Each color maps to a semantic meaning (category, status, type). Don't assign colors randomly. Prefer vibrant-but-not-neon tones that work on dark backgrounds: indigo `#6366f1`, amber `#f59e0b`, emerald `#10b981`, cyan `#06b6d4`, rose `#f43f5e`, violet `#8b5cf6`, orange `#f97316`.
- **Motion is subtle and purposeful.** Transitions: 150–200ms ease-out for hovers, 300–400ms for layout shifts and zoom. Stagger entrance animations by 30–50ms. Never animate just to animate — motion should communicate state change or guide attention.
- **Typography has hierarchy.** Use a monospace font for technical/dev contexts (JetBrains Mono, Fira Code). Use a clean sans-serif for body text (DM Sans, Plus Jakarta Sans). Headings are noticeably larger (1.5–2x body size). Secondary text uses a muted color (`#94a3b8`), not smaller size.

---

## Interaction Design Principles

### Hover States
A hovered element should clearly communicate "I'm interactive." Minimum hover treatment:
- Subtle background color shift OR
- Soft glow/ring in the element's accent color OR
- Scale 1.02–1.05x with `transition: transform 150ms ease-out`
Combine 2 of these for primary interactive elements. Connected/related elements should also react (dim unrelated, brighten related).

### Selection & Focus
When something is selected:
- It should be visually obvious without reading text (ring, glow, filled state, accent border)
- The viewport/scroll should adjust to keep it centered or prominent
- Surrounding context should de-emphasize (reduce opacity of unrelated items to 30–50%)
- A detail panel/sidebar should animate in, not just appear

### Progressive Disclosure
- Show the minimum useful information first
- Use expandable sections, "show more" toggles, and tabbed views to layer detail
- Card previews → expanded detail is always better than everything-at-once

### Empty & Loading States
- Never show a blank screen. Use skeleton loaders that match the layout shape.
- Empty states should have a message and a call to action, not just "No data."

---

## Dark Theme System

Use this layered surface model for all dark UIs:

```
--bg-base: #0a0a14;         /* deepest background */
--bg-surface: #12131f;       /* cards, sidebar, panels */
--bg-elevated: #1a1b2e;      /* hover states, active items, popovers */
--bg-accent: #232442;        /* selected states, highlighted rows */
--border-subtle: rgba(255, 255, 255, 0.06);
--border-visible: rgba(255, 255, 255, 0.12);
--text-primary: #e2e8f0;
--text-secondary: #94a3b8;
--text-tertiary: #64748b;
--shadow-soft: 0 4px 24px rgba(0, 0, 0, 0.25);
--shadow-glow: 0 0 20px rgba(99, 102, 241, 0.15);  /* tinted to accent */
```

Every panel, sidebar, and card should use `--bg-surface` or above. Never place a component on `--bg-base` without a border or shadow to lift it.

---

## Component Patterns

### Sidebar / Detail Panel
- Background: `--bg-surface` with `--shadow-soft` on the leading edge
- Width: 380–420px minimum
- Sections separated by `--border-subtle` dividers or distinct card backgrounds
- Header: icon + title + dismiss button, 20px padding
- Animate in from the side with `transform: translateX` (300ms ease-out)

### Graph / Node Visualizations
- Use `d3-force` or `react-force-graph` for physics-based layouts, never static positioning
- Node size encodes importance (radius 24px–56px mapped to weight/criticality)
- Edge thickness encodes relationship strength
- On node select: smooth zoom/pan to center, fade unrelated nodes to 20% opacity, highlight connected edges
- Edge labels on hover only, not always visible (reduces clutter)
- Animated edge particles or dashed-line flow to indicate data direction

### Buttons & Controls
- Primary: filled with accent color, white text, 8px border-radius, 10px 20px padding
- Secondary: transparent with subtle border, accent text
- Ghost: no border, just text + hover background
- All buttons: `cursor: pointer`, hover darkens/lightens 10%, active scales 0.97

### Tooltips
- Dark background (`--bg-elevated`), 8px radius, 8px 12px padding
- Subtle shadow, 150ms fade-in
- Max-width 240px, concise text only
- Position intelligently (flip if near edge)

---

## Responsive Design — Every Screen, Every Device

All UI must work across desktop, tablet, and mobile. Never build desktop-only and "fix mobile later." Responsive is not an afterthought — it's the default.

### Breakpoints
Use these consistently across the project:
```
--bp-mobile:  480px   /* small phones */
--bp-tablet:  768px   /* tablets, large phones in landscape */
--bp-desktop: 1024px  /* laptops, small monitors */
--bp-wide:    1440px  /* large monitors */
```
Write mobile-first CSS: base styles are mobile, then layer up with `@media (min-width: ...)`.

### Layout Rules by Breakpoint

**Mobile (< 768px):**
- Single column layout. No side-by-side panels.
- Sidebars become full-screen overlays or bottom sheets that slide up, dismissed with a swipe or close button.
- Navigation collapses to a bottom tab bar (for apps) or hamburger menu (for websites). Prefer bottom tab bar — thumbs don't reach the top of the screen.
- Graph/node visualizations take the full viewport. Detail panels overlay on top, not beside.
- Touch targets minimum 44x44px (Apple HIG). No tiny buttons or links.
- Padding scales down: 16px container padding, 12px card padding.
- Font sizes: body 15–16px minimum. Never go below 14px for readable text.
- Hide secondary information. Show only the essential content; rest goes behind taps/toggles.
- Horizontal scrolling is forbidden. If content overflows, it's a bug.

**Tablet (768px – 1023px):**
- Two-column layouts are fine, but sidebars should be collapsible.
- Cards can go 2-across in a grid.
- Detail panels can be side drawers (50% width) or overlays.
- Touch targets still 44x44px — tablets are touch devices.

**Desktop (1024px+):**
- Full multi-panel layouts. Sidebar + main content + optional detail panel.
- Hover states are active (they don't exist on touch).
- Finer interactive elements are okay (smaller buttons, denser tables).

### Component Adaptation Patterns

**Sidebar / Detail Panel:**
- Desktop: fixed side panel, 380–420px
- Tablet: collapsible drawer, overlays content at 50% width
- Mobile: full-screen overlay with a top bar (back arrow + title + close), slides up from bottom or in from right

**Graph Visualizations:**
- Desktop: graph + sidebar side by side
- Mobile: graph takes full screen. Tapping a node opens detail as a bottom sheet (60% height, draggable to full screen). Pinch-to-zoom and two-finger pan.
- Ensure nodes are large enough to tap accurately on mobile (minimum 40px tap target radius)

**Tables & Data-Dense Views:**
- Desktop: full table with all columns
- Tablet: hide lowest-priority columns, show on row expand
- Mobile: convert to a card/list layout. Each row becomes a stacked card. Never horizontally scroll a table.

**Navigation / Header:**
- Desktop: full horizontal nav bar with all items visible
- Mobile: bottom tab bar (4–5 items max) or hamburger with slide-out drawer
- Header should shrink in height on mobile (48px vs 64px desktop)

**Modals & Dialogs:**
- Desktop: centered modal with backdrop
- Mobile: full-screen sheet or bottom sheet. Modals that don't fill the screen feel broken on mobile.

### Technical Implementation
- Use CSS Grid and Flexbox, not fixed widths. Prefer `fr` units over `px` for grid tracks.
- Use `clamp()` for fluid typography: `font-size: clamp(1rem, 2.5vw, 1.25rem)`
- Use `min()`, `max()`, and `clamp()` for fluid spacing too: `padding: clamp(12px, 3vw, 24px)`
- Images and media: `max-width: 100%; height: auto;` always.
- Test at 320px, 375px, 768px, 1024px, 1440px. If it breaks at any of these, fix it.
- Use `dvh` (dynamic viewport height) instead of `vh` on mobile to account for browser chrome.
- For touch devices, add `@media (hover: none)` to disable hover-only interactions and replace with tap/press alternatives.

### What Responsive is NOT
- It's not just shrinking everything. Layouts should reorganize, not just compress.
- It's not hiding everything on mobile. Users need the core functionality on every device.
- It's not "it scrolls, so it works." If the experience is painful, it's not responsive — it's just not broken.

---

## Code Quality

- Use TypeScript. No `any` types.
- Components are small and focused. If a component file exceeds 150 lines, split it.
- Colocate styles with components (CSS modules, Tailwind, or styled-components — be consistent within the project).
- Extract magic numbers into named constants or CSS variables.
- Every interactive element must have `cursor: pointer` and a visible focus state for accessibility.

---

## Before Submitting Any UI Work

Run this checklist mentally:
1. Does every surface layer have distinct contrast from its neighbor?
2. Are there any emojis? (Remove them.)
3. Is there a wall of text anywhere? (Collapse it.)
4. Do interactive elements all have hover + active states?
5. Is the spacing generous enough that nothing feels cramped?
6. Do colors map to meaning, or are they random?
7. Resize the browser to 375px wide — does it still work and look intentional?
8. Tap targets on mobile: are they at least 44x44px?
9. Would this look good in a portfolio? If not, iterate.

---

## Documentation Maintenance

When adding a new user-facing feature (keyboard shortcut, graph interaction, chat capability, CLI command, or UI control):
1. Add the corresponding entry to `src/components/docs/docsContent.js`
2. If the feature involves a keyboard shortcut, add it to the `shortcuts` section
3. If it is a CLI command or flag, add it to the `cli` section
4. Test that the docs page (`/docs`) renders the new content correctly at both desktop and mobile widths

---

## Web App ↔ CLI Sync

The web app (`src/`, `server/`) and CLI tool (`cx/`) share a backend, database, and data models. When making changes to one, always check whether the other needs a corresponding update. Specifically:

**Shared contracts — change in one means change in both:**
- **API schemas & endpoints** (`server/routes/cx.ts`, `server/routes/pipeline.ts`, `server/ai/schemas.ts`): If you add/modify an endpoint or response shape that the CLI calls, update the CLI's corresponding code in `cx/lib/`.
- **Concept/edge data model** (`server/ai/schemas.ts`): Both the web graph (`src/components/GraphCanvas.jsx`) and CLI display (`cx/lib/renderer.ts`, `cx/lib/display.ts`) render concepts and edges. Schema changes must propagate to both.
- **Chat message format** (`server/routes/cx.ts`, `server/routes/chat.ts`): Both `cx/lib/chat.ts` and the web chat panel read/write the same `chat_messages` table. Field additions or renames must be reflected in both.
- **Pipeline stages & progress events**: Both frontends render pipeline progress (web: `ProcessingScreen.jsx`, CLI: `cx/lib/analyzer.ts`). Adding or renaming a stage requires updating both.
- **Project metadata fields**: Both frontends display project info (web: `MyProjects`/`ExplorerView`, CLI: `cx/lib/projects.ts`). New fields should surface in both where relevant.
- **Authentication flow** (`cx/lib/auth.ts`, web auth): Token format or auth endpoint changes affect both clients.

**How to apply:** After completing any change to `src/`, `server/`, or `cx/`, scan the counterpart directories for code that touches the same data model, endpoint, or schema. If a matching file exists, update it. If unsure, grep for the field/endpoint name across both `src/` and `cx/`.

---

## Deploy Command

When the user says "deploy", perform these steps in order:
1. Stage all changed files and create a commit with a descriptive message summarizing what changed
2. Push to the `main` branch on GitHub: `git push origin main`
3. Deploy the backend to Vercel production: `npx vercel --prod`
4. Report the deployment URL when complete
