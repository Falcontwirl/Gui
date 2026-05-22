# Video Generation for Codebase Explainers - Research

**Researched:** 2026-04-14
**Domain:** Programmatic video generation from structured data
**Confidence:** HIGH (Remotion, Motion Canvas, browser APIs) / MEDIUM (NotebookLM, AI video) / LOW (Manim web integration maturity)

---

## Summary

The goal is to generate explanatory videos about codebases from structured analysis data (dependency graphs, file trees, code metrics, architectural patterns) within a React web application targeting CS students.

**The clear winner is Remotion** -- it is a React-native video framework that renders compositions from data, supports both in-browser preview via `<Player>` and server-side export to MP4, and has the largest ecosystem. The most practical architecture is: use Remotion `<Player>` for interactive in-browser playback (no video file needed), with optional server-side rendering via Remotion Lambda for MP4 export.

A secondary strong option is a **pure browser approach** using Canvas animations + `captureStream()` + MediaRecorder, which requires no framework dependency but demands more manual work for timing, transitions, and encoding.

**Primary recommendation:** Use Remotion with `<Player>` for interactive in-app explainer videos rendered from codebase analysis JSON. Defer MP4 export to a server-side Lambda pipeline if users need downloadable files.

---

## Technology Deep Dives

### 1. Remotion (React Video Framework)

**Confidence: HIGH** -- verified via official documentation and multiple authoritative sources.

#### How It Works

Remotion treats a video as a React component that receives a frame number. Each frame is a React render. The `useCurrentFrame()` hook provides the current frame, and `useVideoConfig()` provides dimensions, duration, and FPS. You write standard React/CSS/SVG/Canvas code, and Remotion handles the timeline.

```
Composition = React Component + Video Metadata (width, height, durationInFrames, fps)
```

Every composition is registered in `src/Root.tsx` as a `<Composition>` element. Data is passed via props -- including dynamically fetched data via the `calculateMetadata` prop.

#### Data-Driven Video Generation

This is Remotion's strongest selling point for our use case:

- **JSON input:** Pass structured data (dependency graph, file tree, metrics) as props to a composition
- **`calculateMetadata`:** Fetch data from an API before rendering, dynamically set duration/props
- **Dataset rendering:** Batch-render multiple videos from a JSON array
- **json-render-remotion:** A community tool that converts declarative JSON timeline specs into rendered compositions

**Example flow for codebase explainers:**
```
Codebase Analysis JSON --> Remotion Composition Props --> React components render
  - Animated dependency graph (d3-force + React)
  - File tree walkthrough (animated list)
  - Code metrics dashboard (animated charts)
  - Architecture diagram reveal (SVG animations)
```

#### Rendering Options

| Option | Where | Speed | Format | Cost |
|--------|-------|-------|--------|------|
| **`<Player>`** | Browser (client) | Real-time | Interactive (no file) | Free |
| **Client-side render** | Browser (WebCodecs) | Near real-time | WebM (limited) | Free |
| **Remotion Lambda** | AWS Lambda | Fast (distributed) | MP4, WebM, GIF | ~$0.001-$0.02/video |
| **Node.js SSR** | Your server | Slower | All formats | Server costs |

**`<Player>` is the key insight.** You do NOT need to render a video file at all. The `<Player>` component embeds an interactive, seekable, playable Remotion composition directly in a React app. The video updates instantly when props change. This is perfect for an interactive explainer that responds to user data.

Client-side rendering (to actual video files) uses WebCodecs via "Mediabunny" instead of FFmpeg. It is experimental and limited to a subset of HTML elements. WebCodecs browser support: Chrome 94+, Firefox 130+, Safari 26+.

#### Licensing

- **Free** for individuals and small companies (including commercial use)
- **Company license required** for larger for-profit organizations
- Pricing starts around $250/year per developer seat (verify current rates at remotion.pro)

#### Strengths for Our Use Case

- React-native: integrates directly into existing React codebase
- `<Player>` component: no video rendering needed for in-app experience
- Data-driven: compositions take JSON props, perfect for codebase analysis data
- Full web tech: can use d3-force for graphs, CSS for transitions, SVG for diagrams
- Active ecosystem: ~60K weekly npm downloads, active Discord, commercial backing

#### Limitations

- Client-side video export is experimental with element restrictions
- Full MP4 export requires server (Lambda or Node.js)
- Learning curve for animation timing (though React knowledge transfers)
- License cost for company use

---

### 2. NotebookLM (Google)

**Confidence: MEDIUM** -- API exists for enterprise; no video generation; audio only.

#### Current Capabilities

- **Audio Overviews:** Generates podcast-style audio summaries from source documents
- **No video generation:** NotebookLM generates audio only, not video
- **API:** Available through Google Cloud (NotebookLM Enterprise) for programmatic audio overview generation
- **Upcoming:** "Lecture" format (single-host 30-minute monologue) leaked for late 2025/2026

#### API Access

The NotebookLM Enterprise API allows:
1. Create a notebook programmatically
2. Add data sources (Google Docs, Slides, raw text, web URLs, YouTube)
3. Generate audio overview of the notebook
4. Retrieve the audio file

**Limitation:** Enterprise-only, requires Google Cloud billing. Not available as a free/consumer API.

#### Integration Feasibility for Codebase Explainers

| Aspect | Assessment |
|--------|------------|
| Can generate video? | NO -- audio only |
| API available? | YES -- Enterprise only |
| Could pair with Remotion? | YES -- generate audio narration, sync with Remotion visuals |
| Cost | Google Cloud Enterprise pricing (not cheap) |
| Quality | High (natural-sounding podcast voices) |
| Customizability | Low (you provide sources, Google controls the script) |

**Verdict:** NotebookLM could serve as an audio narration layer paired with a visual framework like Remotion, but it cannot generate video. The lack of script control is a significant limitation -- you cannot dictate exactly what it says about a codebase. The Enterprise requirement makes it impractical for a student-facing product.

---

### 3. Motion Canvas

**Confidence: HIGH** -- verified via official docs and comparison sources.

#### Overview

TypeScript library for creating animated videos using the Canvas 2D API. Uses generator functions to define animation sequences imperatively. Includes a web-based editor with real-time preview powered by Vite.

#### How It Differs from Remotion

| Aspect | Remotion | Motion Canvas |
|--------|----------|---------------|
| Language | React (JSX) | TypeScript (generators) |
| Rendering | Full DOM (headless browser) | Canvas 2D |
| Animation style | Declarative (props over time) | Imperative (yield-based sequences) |
| Embeddable player | Yes (`<Player>`) | No built-in player component |
| Data-driven | Strong (JSON props) | Possible but not primary focus |
| Ecosystem size | ~60K weekly downloads | ~8K weekly downloads |
| License | Source-available (company license) | MIT (fully open source) |
| Export | MP4, WebM, GIF via FFmpeg/Lambda | Images + FFmpeg |

#### Strengths

- Excellent for hand-crafted, educational animation sequences
- Imperative generator API feels natural for step-by-step explanations
- Real-time preview editor
- Truly open source (MIT)
- Good for synchronized voiceover content

#### Limitations for Our Use Case

- **No embeddable player component** -- cannot embed in a React app like Remotion's `<Player>`
- **Canvas 2D only** -- cannot render arbitrary HTML/CSS (no styled code blocks, no DOM elements)
- **Not data-driven by default** -- designed for hand-authored animations, not generated from JSON
- **Smaller ecosystem** -- fewer examples, community resources
- **Export requires FFmpeg** -- no client-side video rendering

**Verdict:** Motion Canvas is excellent for pre-authored educational content but poorly suited for data-driven, dynamically generated explainer videos embedded in a React app. Missing the `<Player>` equivalent is a dealbreaker for our interactive use case.

---

### 4. Manim (Python Animation Framework)

**Confidence: LOW** -- web integration claims are poorly verified; Python dependency is architecturally complex.

#### Overview

Community-maintained Python framework for creating mathematical animations, originally created by 3Blue1Brown. Produces high-quality vector animations ideal for educational content.

#### Web Integration Status

- **manim-web:** A browser-based editor exists for creating Manim animations
- **manim-js:** Community JavaScript port exists but is immature
- **WebAssembly compilation:** Planned for 2026 but not production-ready
- **Primary output:** Video files (MP4) generated server-side via Python

#### Feasibility Assessment

| Aspect | Assessment |
|--------|------------|
| Can run in browser? | Not natively. JS ports exist but are immature |
| Server-side? | Yes, but requires Python + LaTeX + FFmpeg |
| Data-driven? | Yes (Python can consume JSON) |
| Integration with React app? | Very difficult -- different runtime (Python vs JS) |
| Quality | Excellent for math/diagram animations |
| Customizability | High (full Python) |

**Verdict:** Manim produces beautiful educational animations but requires a Python server, has no React integration path, and the JS ports are not production-ready. Architecturally incompatible with a JavaScript/React web application without significant infrastructure.

---

### 5. Lottie / After Effects Pipeline

**Confidence: MEDIUM**

#### Overview

Lottie renders After Effects animations from JSON in the browser via SVG or Canvas. Animations are authored in After Effects, exported via the Bodymovin plugin as JSON, and played back with lottie-web.

#### Data-Driven Capabilities

- Lottie animations are JSON, so they can be manipulated programmatically
- Parameters can be swapped at runtime (colors, text, numbers)
- However, **the animation structure itself must be pre-authored in After Effects**
- You cannot procedurally generate a Lottie animation from arbitrary data

#### Feasibility for Codebase Explainers

| Aspect | Assessment |
|--------|------------|
| Dynamic from data? | Partially -- can swap parameters, not structure |
| Authoring | Requires After Effects (designer workflow) |
| Quality | High (vector, smooth) |
| Integration | Easy (lottie-web, lottie-react) |
| Programmatic generation? | NO -- templates only |

**Verdict:** Lottie is excellent for pre-authored animated assets (loading spinners, transition effects, decorative elements) but cannot generate explainer videos from arbitrary codebase data. Could be used for polished micro-animations within a Remotion composition, but not as the primary video generation approach.

---

### 6. AI Video Generation APIs (Runway, Pika, Sora)

**Confidence: MEDIUM**

#### Current State (2026)

- **Runway Gen-4:** Professional-grade, strong API, good for cinematic content
- **Pika 2.2:** Accessible, fast iteration, consumer-friendly API via fal.ai
- **Sora (OpenAI):** High quality but limited API access
- All produce 5-10 second clips from text/image prompts, up to 1080p/4K

#### Suitability for Technical Diagrams

| Aspect | Assessment |
|--------|------------|
| Can generate code/diagram content? | NO -- produces naturalistic/cinematic video |
| Consistency | Poor for technical content (hallucinated text, imprecise layouts) |
| Text rendering | Unreliable (garbled text is a known limitation) |
| Deterministic output? | NO -- generative models produce different results each time |
| Cost | $0.05-$0.50+ per generation |
| Speed | 30 seconds to several minutes per clip |

**Verdict: NOT SUITABLE.** AI video generation models are designed for cinematic/creative content, not precise technical diagrams. They cannot reliably render text, code, or structured diagrams. Every generation would be different, making consistent educational content impossible. Cost and latency are also prohibitive for on-demand generation.

---

### 7. Browser-Native Approach (Canvas + MediaRecorder)

**Confidence: HIGH** -- well-documented browser APIs, widely supported.

#### How It Works

1. Render animations to an HTML Canvas element
2. Call `canvas.captureStream(fps)` to get a MediaStream
3. Feed the stream to a `MediaRecorder` instance
4. Collect recorded chunks as Blobs
5. Combine into a downloadable video file

#### Technical Details

```javascript
// Core pattern
const stream = canvas.captureStream(30); // 30 fps
const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
const chunks = [];
recorder.ondataavailable = (e) => chunks.push(e.data);
recorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'video/webm' });
  // Download or process blob
};
recorder.start();
// Run animation...
recorder.stop();
```

#### Capabilities and Limitations

| Aspect | Assessment |
|--------|------------|
| Runs in browser? | YES -- fully client-side |
| Output format | WebM (native). MP4 requires ffmpeg.wasm conversion |
| Audio support | Yes, can add audio tracks to MediaStream |
| Quality | Depends on canvas rendering quality |
| Browser support | Chrome 52+, Firefox 43+, Safari 14+ |
| Frame rate control | `captureStream(0)` allows manual frame capture |
| Cost | Free (no server needed) |

#### Strengths

- Zero dependencies possible (pure browser APIs)
- Full client-side, no server needed
- Works with any canvas-based rendering (d3, Three.js, custom)
- Established, stable APIs

#### Limitations

- **No native MP4 export** -- MediaRecorder produces WebM in most browsers
- **Real-time recording** -- must actually play the animation to record (no faster-than-realtime)
- **No built-in timeline/composition** -- you build everything from scratch
- **WebM compatibility** -- some devices/platforms don't play WebM well
- **Manual orchestration** -- timing, transitions, scenes all manual

**Verdict:** Viable as a lightweight approach if you only need simple canvas-based animations exported as video. But for complex multi-scene explainers with text, code, graphs, and transitions, you would essentially be rebuilding what Remotion already provides. Best used as a fallback or for simple recording features.

---

### 8. WebCodecs API (Direct Encoding)

**Confidence: HIGH** -- W3C specification, broad browser support as of 2025-2026.

#### Overview

Low-level API for per-frame video encoding/decoding in the browser. Unlike MediaRecorder (which records in real-time), WebCodecs can encode frames as fast as the CPU allows.

#### Browser Support (2025-2026)

- Chrome 94+: Full support
- Firefox 130+: Full support
- Safari 26+: VideoDecoder supported; AudioDecoder in Safari Technology Preview

#### Relevance

WebCodecs is what Remotion's client-side rendering uses under the hood (via Mediabunny). You could use it directly, but Remotion abstracts the complexity. Using WebCodecs directly would mean:

- Writing your own muxer (combining audio + video streams)
- Managing codec selection and configuration
- Building your own composition/timeline system

**Verdict:** WebCodecs is the underlying technology that enables client-side video encoding. Use it through Remotion rather than directly, unless you have very specific low-level requirements.

---

## Feasibility Matrix

### Can each approach generate codebase explainer videos from structured data?

| Approach | Data-Driven | Client-Side | Quality | Consistency | Integration | Cost | Recommendation |
|----------|-------------|-------------|---------|-------------|-------------|------|----------------|
| **Remotion `<Player>`** | YES (JSON props) | YES (interactive) | HIGH | HIGH (deterministic) | EASY (React) | Free* | **PRIMARY CHOICE** |
| **Remotion Lambda** | YES | NO (server) | HIGH | HIGH | MEDIUM | ~$0.01/vid | For MP4 export |
| **Motion Canvas** | Partial | NO | HIGH | HIGH | HARD (no player) | Free | Not recommended |
| **Manim** | YES | NO (Python) | HIGH | HIGH | VERY HARD | Free | Not recommended |
| **Lottie** | Templates only | YES | HIGH | HIGH | EASY | Free | Micro-animations only |
| **AI Video APIs** | NO | NO | MEDIUM | LOW | MEDIUM | $0.05-0.50/gen | NOT SUITABLE |
| **Canvas+MediaRecorder** | Manual | YES | MEDIUM | HIGH | HARD (DIY) | Free | Fallback only |
| **NotebookLM** | Audio only | NO | HIGH (audio) | MEDIUM | HARD (Enterprise) | Enterprise | Audio layer only |

*Free for individuals/small companies

---

## Recommended Architecture

### Tier 1: Interactive In-App Explainer (Remotion `<Player>`)

**No video file generated.** The Remotion `<Player>` component renders the explainer as an interactive, seekable, playable React component directly in the app.

```
Codebase Analysis Pipeline
    |
    v
Structured JSON (graph, metrics, insights)
    |
    v
Remotion <Player> Component
    |-- Scene 1: Project overview (animated file tree)
    |-- Scene 2: Dependency graph (d3-force animated)
    |-- Scene 3: Key metrics (animated charts)
    |-- Scene 4: Architecture patterns (diagram reveal)
    |-- Scene 5: Insights & recommendations
    v
Interactive playback in browser (play/pause/seek)
```

**Why this wins:**
- No rendering delay -- plays instantly from data
- Interactive -- user can pause, seek, replay sections
- Data-reactive -- updates when analysis changes
- No server infrastructure for video encoding
- Full React/CSS/SVG capabilities for rich visuals
- Integrates naturally into an existing React app

### Tier 2: Downloadable Video Export (Remotion Lambda)

For users who want to share/download an MP4:

```
User clicks "Export Video"
    |
    v
API call to backend with codebase analysis JSON
    |
    v
Remotion Lambda renders composition to MP4
    |
    v
S3 presigned URL returned to client
    |
    v
User downloads MP4
```

**Cost:** ~$0.01-0.02 per video render on Lambda.

### Tier 3: Audio Narration (Future Enhancement)

Pair with a TTS service (not NotebookLM -- too restrictive) to generate voice narration:

- Use structured analysis to generate a script
- Feed script to a TTS API (ElevenLabs, OpenAI TTS, Google Cloud TTS)
- Sync audio with Remotion composition using `<Audio>` component

---

## Implementation Considerations

### What You Would Build

1. **Remotion composition components** that visualize codebase data:
   - `<FileTreeScene>` -- animated file tree reveal
   - `<DependencyGraphScene>` -- force-directed graph animation
   - `<MetricsScene>` -- animated metric cards/charts
   - `<ArchitectureScene>` -- layered architecture diagram
   - `<InsightsScene>` -- key findings with code snippets

2. **A data-to-timeline mapper** that takes codebase analysis JSON and produces:
   - Scene order and durations
   - Per-scene props (which files to highlight, which dependencies to show)
   - Transition timings

3. **The `<Player>` integration** in the existing React app

### Key Dependencies

```bash
npm install remotion @remotion/player @remotion/cli
# Optional for export:
npm install @remotion/lambda  # AWS Lambda rendering
```

### Estimated Effort

| Component | Effort | Notes |
|-----------|--------|-------|
| Basic Remotion setup | 1-2 days | Project scaffolding, first composition |
| File tree animation scene | 2-3 days | Animated tree reveal with highlighting |
| Dependency graph scene | 3-5 days | d3-force integration with animated transitions |
| Metrics dashboard scene | 2-3 days | Animated counters, charts |
| Architecture diagram scene | 3-4 days | SVG-based layered diagram |
| Data-to-timeline mapper | 2-3 days | JSON analysis to composition props |
| Player integration | 1 day | Embed in existing app |
| Lambda export (optional) | 2-3 days | AWS setup, API endpoint |
| **Total** | **~15-24 days** | For full multi-scene explainer |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video composition/timeline | Custom canvas animation system | Remotion | Timing, transitions, seeking, scene management are complex |
| Video encoding in browser | Raw WebCodecs usage | Remotion client-side render | Muxing, codec config, error handling |
| Interactive video player | Custom `<canvas>` player | Remotion `<Player>` | Play/pause/seek/scrub already built |
| Force-directed graphs | Custom physics simulation | d3-force (within Remotion) | Battle-tested graph layout |
| Frame-by-frame animation | requestAnimationFrame loop | Remotion's frame model | Deterministic, seekable, composable |

---

## Common Pitfalls

### 1. Trying to Generate Actual Video Files Client-Side
**What goes wrong:** Attempting MP4 export in the browser leads to format limitations (WebM only), slow encoding, and browser compatibility issues.
**How to avoid:** Use `<Player>` for in-app playback (no file needed). Only generate video files server-side when users explicitly request download/export.

### 2. Over-Animating
**What goes wrong:** Too many simultaneous animations make explainers confusing rather than clarifying.
**How to avoid:** One concept per scene. Sequential reveals. Pause on key insights. Educational content needs breathing room.

### 3. Hardcoding Scene Durations
**What goes wrong:** Fixed durations don't adapt to varying amounts of data (a project with 5 files vs 500 files).
**How to avoid:** Calculate durations dynamically based on data volume. Use `calculateMetadata` to set `durationInFrames` from props.

### 4. Ignoring the Player API
**What goes wrong:** Building custom play/pause/seek controls from scratch.
**How to avoid:** Remotion Player's API mirrors the native `<video>` element. Use its built-in controls or the programmatic API for custom UI.

---

## Open Questions

1. **Audio narration:** Which TTS service produces the best educational narration? (ElevenLabs vs OpenAI TTS vs Google Cloud TTS) -- needs separate research if audio is pursued.

2. **Remotion client-side rendering maturity:** The feature is marked experimental. How limited is the "subset of HTML elements"? This needs hands-on testing to determine if it blocks any planned scene types.

3. **Performance with large codebases:** How does Remotion `<Player>` perform when rendering complex d3-force graphs with 500+ nodes in real-time? May need optimization strategies (canvas rendering for graphs, simplified views for large projects).

4. **Remotion company license threshold:** At what company size does the license become required? This affects long-term cost if the product scales.

---

## Sources

### Primary (HIGH confidence)
- [Remotion official docs -- Fundamentals](https://www.remotion.dev/docs/the-fundamentals)
- [Remotion official docs -- Player](https://www.remotion.dev/docs/player/)
- [Remotion official docs -- Client-side rendering](https://www.remotion.dev/docs/client-side-rendering/)
- [Remotion official docs -- Dataset render](https://www.remotion.dev/docs/dataset-render)
- [Remotion official docs -- SSR comparison](https://www.remotion.dev/docs/compare-ssr)
- [Remotion official docs -- Lambda cost](https://www.remotion.dev/docs/lambda/cost-example)
- [Remotion official docs -- License](https://www.remotion.dev/docs/license)
- [Motion Canvas official docs](https://motioncanvas.io/docs/)
- [MDN -- MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API)
- [MDN -- WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [MDN -- captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)

### Secondary (MEDIUM confidence)
- [Remotion vs Motion Canvas comparison](https://www.remotion.dev/docs/compare/motion-canvas)
- [Remotion + Claude AI video pipeline](https://dev.to/mayu2008/new-clauderemotion-to-create-amazing-videos-using-ai-37bp)
- [JSON Render Remotion -- AI video from JSON](https://medium.com/@kenzic/building-ai-generated-video-with-json-render-and-remotion-b9f1000ff7af)
- [Google Cloud -- NotebookLM Enterprise API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-audio-overview)
- [Manim Community](https://www.manim.community/)
- [Lottie Animation Community](https://lottie.github.io/)
- [WaveSpeedAI -- AI Video APIs Guide 2026](https://wavespeed.ai/blog/posts/complete-guide-ai-video-apis-2026/)

### Tertiary (LOW confidence)
- Manim-web browser integration maturity claims (single source, unverified adoption stats)
- Remotion exact current pricing (2022 pricing found, current rates may differ)

---

## Metadata

**Confidence breakdown:**
- Remotion capabilities & architecture: HIGH -- official documentation verified
- Motion Canvas comparison: HIGH -- official comparison page + docs
- Browser APIs (MediaRecorder, WebCodecs, captureStream): HIGH -- MDN documentation
- NotebookLM API: MEDIUM -- Google Cloud docs verified, but enterprise-only limits testing
- AI video generation suitability: MEDIUM -- multiple sources agree on limitations
- Manim web integration: LOW -- claims from single sources, JS ports immature
- Lottie data-driven limits: MEDIUM -- well-understood technology, clear architectural constraints

**Research date:** 2026-04-14
**Valid until:** 2026-07-14 (Remotion and browser APIs are stable; AI video landscape changes fast)
