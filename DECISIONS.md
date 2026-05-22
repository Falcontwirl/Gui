# Implementation Decisions

## Original Build (Steps 1-11)

### Model Choices
- Main Claude calls: `claude-sonnet-4-6`
- Cheap/fast calls: `claude-haiku-4-5-20251001`
- Embeddings: OpenAI `text-embedding-3-small` (1536 dimensions)

### Server Port
- Port 3007 (changed from 3001 → 3005 → 3007 due to stale Windows Node processes)

### Claude Response Normalization
- Added normalization layer in conceptSynthesis.ts for varying field names from Claude
- Defensive Array.isArray() checks across pipeline stages

---

## Educational Layer Extension

### Hand-crafted vs pipeline-generated curated content
**Decision:** Hand-crafted concept graphs for all 6 curated codebases.
**Why:** Pre-generated content loads instantly (no pipeline wait), guarantees educational quality, and allows carefully written explanation registers. Running the pipeline on real repos would produce less pedagogically structured content.

### Single user ID ("anonymous") vs Supabase Auth
**Decision:** Use "anonymous" string as user_id for now.
**Why:** The existing app doesn't enforce auth for the explorer flow. Adding auth gates would block the learning path. Can upgrade to auth.uid() later.

### Confidence scoring model
**Decision:** Simple additive model with engagement-type weights: click (+0.05), read_explanation (+0.10), time_spent (+0.08), chat_about (+0.12). Capped at 1.0.
**Why:** More sophisticated models (spaced repetition, decay) would be premature. Evidence array (last 20 interactions) enables future model upgrades without migration.

### Register thresholds
**Decision:** <0.3 = Register 0 (zero knowledge), 0.3-0.7 = Register 1 (some familiarity), >0.7 = Register 2 (comfortable).
**Why:** Maps to the three pre-generated explanation levels already in the concept graph data. Intentionally generous on beginner side.

### Gap-filling node selection
**Decision:** For curated codebases, proactive engine finds the unexplored concept node whose mapped universal concepts have the lowest average confidence. For uploaded codebases, falls back to the original exploration path.
**Why:** Gap-filling only works reliably when universal concept mappings exist (hand-crafted for curated, AI-generated for uploads).

### Origin context on project, not user
**Decision:** The "how did this codebase come to exist" answer stored on projects.origin_context.
**Why:** Different uploads may have different origins. Context applies to the project, not the person.

### Curated codebases create real project records
**Decision:** Loading a curated codebase creates a full project + concepts + edges + user_state in the database.
**Why:** Reuses the same data model as pipeline-processed uploads, requiring zero frontend changes for the explorer experience.

### 25 universal concepts
**Decision:** 25 concepts across 4 categories (frontend, backend, database, general).
**Why:** Covers the full stack without being overwhelming. Each concept is genuinely distinct. Easy to extend later via INSERT.

### 6 curated codebases
**Decision:** Express.js, React TodoMVC (beginner), REST API with Auth, CLI Tool, Realtime Chat (intermediate), Next.js Full-Stack (advanced).
**Why:** Covers progression from basic HTTP to full-stack. Real, well-known projects that CS students encounter. Each teaches distinct universal concepts with minimal overlap.
