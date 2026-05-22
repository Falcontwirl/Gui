# Pivot Analysis: CLI Tool (`cx`) for Query-Scoped Codebase Exploration

## Executive Summary

The proposed `cx "how does the login system work?"` flow fills a genuine gap: **no existing tool takes a natural language query and produces a shareable, visual trace of a feature through a codebase.** Every CLI tool (Claude Code, Aider, Codex CLI, Gemini CLI, Continue, Mentat) outputs terminal text that dies when the session ends. Every visualization tool (CodeSee, CodeViz, CodeCharta) shows full-codebase graphs with no query scoping. The intersection — query-driven, visual, shareable — is unoccupied.

However, calling this a "pivot away from a website" is misleading. **You still need a web frontend** for the shareable link. What you're really building is a CLI entry point that triggers a focused, query-scoped analysis and opens the result in a browser. This is an extension, not a replacement.

**Recommendation: Proceed, but as a new entry point to the existing product, not a rewrite.**

---

## 1. Competitive Landscape

| Tool | Interface | Output | Visual? | Shareable? | Query-scoped? |
|------|-----------|--------|---------|------------|---------------|
| Claude Code | CLI REPL | Terminal text | No | No | Yes (conversational) |
| Aider | CLI REPL | Diffs + text | No | No | Yes |
| Gemini CLI | CLI REPL | Text reports | No | No | Yes |
| Sourcegraph Cody/Amp | IDE + CLI | Text answers | No | No | Yes (RAG) |
| Continue.dev | CLI + IDE | Terminal text | No | No | Yes |
| CodeSee | Web + CI | Interactive maps | Yes | Yes | No (full repo) |
| CodeViz | Web | Architecture views | Yes | Yes | No (full repo) |
| CodeCharta | CLI + web | 3D city maps | Yes | Exportable | No (metrics-only) |
| Swark | CLI | Mermaid diagrams | Semi | File export | No (full repo) |
| **cx (proposed)** | **CLI one-shot** | **Shareable link** | **Yes** | **Yes** | **Yes** |

**The gap is clear:** No tool combines all three of query-scoped + visual + shareable. The closest is Sourcegraph (query-scoped but text-only) and CodeSee (visual + shareable but full-repo-only).

---

## 2. Pipeline Reusability Audit

The current pipeline: `fileAnalysis → conceptSynthesis → depthMapping → insightGeneration → embedding/RAG → conceptMapping → quizGeneration`

### What transfers directly

| Module | Reusability | Notes |
|--------|-------------|-------|
| `ai/claude.ts` | **HIGH** | Clean abstraction over Anthropic API. Works anywhere — no Supabase coupling. Structured output via tool_use is exactly what the CLI needs. |
| `pipeline/fileAnalysis.ts` | **HIGH** | Takes `Record<string, string>` (path→content). Already batch-processes files with Claude. The only Supabase call is storing results — trivially replaceable with in-memory or local file storage. |
| `pipeline/orchestrator.ts` | **MEDIUM** | Good structure (detect framework/language, classify files, filter for analysis, prioritize). Supabase calls for progress tracking and storage need swapping out, but the pipeline logic itself is reusable. |
| `rag/chunker.ts` | **HIGH** | Pure function. Takes file contents + context info, returns chunks. Zero Supabase dependency. |
| `rag/embedder.ts` | **HIGH** | Wraps OpenAI embeddings API. No Supabase dependency. |
| `rag/retriever.ts` | **LOW** | 100% Supabase-dependent (calls `search_code_chunks` RPC + pgvector). Would need a local vector store alternative (e.g., in-memory cosine similarity, or a lightweight lib like `vectra`). |
| `pipeline/conceptSynthesis.ts` | **MEDIUM** | Core AI logic (grouping files into architectural concepts) is highly reusable. But it stores results in Supabase (`concepts`, `concept_edges`, `files` tables) and would need a storage adapter. |
| `pipeline/depthMapping.ts` | **MEDIUM** | Generates multi-level explanations. AI logic is reusable, Supabase storage needs swapping. For a focused query, you might not need all three explanation levels — just the one relevant to the query. |
| `pipeline/embedding.ts` | **MEDIUM** | Orchestrates chunking + embedding + storage. The chunking/embedding parts are reusable; the Supabase insert loop needs replacing. |
| `pipeline/insightGeneration.ts` | **LOW (for CLI)** | Generates proactive insights for the exploration UI. Not relevant to a query-scoped CLI flow. |
| `pipeline/quizGeneration.ts` | **LOW (for CLI)** | Quiz system for learning. Not relevant to CLI. |
| `pipeline/conceptMapping.ts` | **LOW (for CLI)** | Universal concept mapping for the learning UI. Not relevant. |

**Bottom line: ~60% of the pipeline logic transfers.** The AI analysis core (file analysis, concept synthesis, chunking, embedding) works. The main gap is replacing Supabase with local storage/retrieval for the CLI path.

---

## 3. The Hard Parts

### 3.1 The "Shareable Link" Problem

This is the single biggest architectural question. A shareable link implies:
- A hosted web viewer (your existing React frontend, or a new lightweight one)
- A server that stores and serves the analysis results
- A URL scheme (`https://cxplore.dev/r/abc123`)

**This means you still need your web app.** The CLI doesn't replace it — it becomes an entry point that:
1. Analyzes the local repo
2. Uploads the scoped results to your server
3. Returns a URL

**Alternative:** Generate a self-contained HTML file locally (like `coverage` reports do). No server needed for sharing — just send the file. This is simpler but less polished.

**Recommendation:** Start with the self-contained HTML approach for MVP. Add hosted links in v2 once you validate the core flow.

### 3.2 Local Repo Analysis Without Upload

Currently, the pipeline requires:
1. User zips their repo in the browser
2. Frontend sends `fileContents` as JSON to the server
3. Server processes through Claude API

For the CLI, you need to:
1. Read the local filesystem (trivial with Node.js `fs`)
2. Apply the same filtering (`filterForAnalysis`, `prioritizeFiles`) — these are pure functions, already reusable
3. Run file analysis and concept synthesis — but **only for files relevant to the query**

**Key insight:** You don't need to analyze the entire repo to answer "how does the login system work?" You need to:
1. Find files likely related to "login" (grep/AST search + file path heuristics)
2. Run concept synthesis on just those files + their direct dependencies
3. Build a focused subgraph

This is actually **faster and cheaper** than the full pipeline — fewer API calls, smaller context.

### 3.3 Query-Scoped File Selection

This is the novel technical challenge. Given a query like "how does the login system work?", how do you select the right ~10-30 files (out of potentially thousands) to analyze?

**Approach (no embeddings needed for MVP):**
1. **Keyword extraction:** Use Claude to extract key terms from the query ("login", "auth", "session", "password", "JWT")
2. **File path matching:** Grep for those terms in file paths and file contents
3. **Import tracing:** From the matched files, follow import/require edges to find connected files
4. **Pruning:** Cap at ~30 files, prioritize using the existing `prioritizeFiles` scoring

This avoids the cold-start problem of embeddings (you'd need to embed the entire repo before you can query it, which defeats the purpose of a fast CLI tool).

### 3.4 Performance Budget

A CLI tool lives or dies on speed. Target: **under 30 seconds** from invocation to link opening.

| Step | Target time |
|------|-------------|
| Read local files + filter | < 1s |
| Extract query terms (local heuristic or small LLM call) | < 2s |
| Find relevant files (grep + import trace) | < 2s |
| File analysis (Claude API, ~15-30 files) | 5-10s |
| Concept synthesis (Claude API, focused) | 3-5s |
| Generate visualization | < 2s |
| Open in browser | < 1s |
| **Total** | **~15-25s** |

This is achievable because you're analyzing 15-30 files instead of 100+.

---

## 4. Who Benefits? Audience Analysis

| Persona | CLI benefit | CLI friction |
|---------|-------------|--------------|
| **Onboarding engineer** | High. `cx "how does billing work?"` on day 1 is exactly the use case. | Low — they already live in the terminal. |
| **CS student** | Medium. Would use it on class projects or OSS repos they're studying. | Medium — less terminal-native, might prefer the web UI. |
| **Code reviewer** | High. `cx "what does this PR touch?"` before reviewing. | Low. |
| **OSS contributor** | High. `cx "how do plugins work?"` before first contribution. | Low. |

**The CLI strongly favors the "onboarding devtool" positioning over the "CS student learning" positioning.** Students are less likely to use a CLI tool; working engineers use CLIs daily. This doesn't mean abandoning students — the web app still serves them. But the CLI is primarily a devtool play.

---

## 5. What to Cut From the Original Idea

| Original idea | Keep / Cut / Change |
|---------------|---------------------|
| `cx "query"` invocation | **Keep.** Clean, intuitive interface. |
| Outputs a "special link" | **Change.** Start with local HTML file, add hosted links later. |
| Shows the feature "as part of the pipeline, end-to-end" | **Keep, but clarify.** Show the feature's flow across files/concepts as a focused graph — not a literal pipeline diagram. |
| "Instead of a graph of the entire codebase" | **Keep.** Query-scoping is the differentiator. |
| "Instead of a website" | **Cut.** This isn't "instead of" — it's "in addition to." The web viewer stays. |
| Terminal-based tool installed with npm | **Keep.** `npx cx` or `npm install -g cx` is the right distribution. |
| Full pipeline on every invocation | **Cut.** Don't run embeddings, quizzes, depth mapping, insights for CLI. Focused analysis only. |

---

## 6. Recommended MVP Scope

### What the MVP does:
1. User runs `cx "how does authentication work?"` in a repo directory
2. Tool reads local files, filters to ~20 relevant files using keyword + import tracing
3. Runs file analysis + concept synthesis via Claude API (2 API calls, ~10-15s)
4. Generates a self-contained HTML file with an interactive focused graph
5. Opens it in the default browser
6. Optionally: `cx --share` uploads to your server and returns a URL

### What the MVP does NOT do:
- Full-repo analysis (that's what the web app is for)
- Embeddings or RAG (too slow for cold-start CLI)
- Quizzes, insights, depth mapping, skill profiles
- User accounts or project persistence
- Interactive REPL mode (one-shot only for v1)

### Package structure:
```
cx/
  bin/cx.ts          # CLI entry point (commander or yargs)
  lib/
    fileReader.ts     # Read local repo, apply filters
    queryScoper.ts    # Extract terms, find relevant files, trace imports
    analyzer.ts       # Reuse fileAnalysis + conceptSynthesis (decoupled from Supabase)
    renderer.ts       # Generate self-contained HTML with embedded graph
  templates/
    viewer.html       # Graph viewer template (could reuse/simplify existing React components)
```

### Estimated effort:
- **Week 1:** File reader + query scoper + analyzer (decoupled from Supabase)
- **Week 2:** HTML renderer + graph viewer template
- **Week 3:** Polish, `--share` flag, npm packaging, README
- **Buffer:** 1 week for edge cases, testing on real repos

---

## 7. Key Risks

1. **Query scoping accuracy.** If `cx "how does auth work?"` misses the auth files or includes irrelevant ones, the output is useless. Mitigation: combine multiple signals (path matching, content grep, import tracing) and let the user pass `--include src/auth/` to override.

2. **API cost per invocation.** Two Claude API calls per query. At Haiku pricing (~$0.001/query), this is negligible. At Sonnet pricing (~$0.01-0.03/query), it adds up for heavy users. Mitigation: use Haiku for file analysis, Sonnet only for concept synthesis.

3. **Name collision.** `cx` is short and may conflict with existing tools. Check npm registry. Alternatives: `cxplore`, `codex` (taken), `archi`, `mapcode`.

4. **Self-contained HTML quality.** Generating a standalone HTML file with an embedded interactive graph (d3-force) that looks good without a build step is non-trivial. The HTML needs to include all JS/CSS inline. Mitigation: use a simple, well-tested template; don't try to replicate the full web app.
