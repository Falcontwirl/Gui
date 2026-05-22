# AI-Native Application Best Practices with Anthropic API

**Researched:** 2026-03-31
**Domain:** AI-native application development (Anthropic Claude API, multi-agent orchestration, streaming, RAG, Supabase pgvector)
**Confidence:** HIGH (primary sources are official Anthropic and Supabase documentation)

## Summary

This research covers the five core areas needed to build production-quality AI-native applications with the Anthropic API: tool use and structured outputs, multi-agent orchestration, streaming responses, RAG best practices, and Supabase pgvector for semantic search. The findings are drawn primarily from official Anthropic platform documentation (platform.claude.com), Anthropic engineering blog posts, and official Supabase documentation.

**Primary recommendation:** Use the Anthropic TypeScript SDK directly (no LangChain) with native tool_use for agentic workflows, structured outputs via `output_config.format` for reliable JSON, SSE streaming for real-time frontends, Anthropic's contextual retrieval approach for RAG, and Supabase pgvector with HNSW indexes for vector storage.

---

## 1. Anthropic API Tool Use

**Confidence: HIGH** -- All information sourced from official Anthropic platform documentation.

### How Tool Use Works

Claude supports two categories of tools:

| Category | Execution | Examples | You Handle Results? |
|----------|-----------|----------|---------------------|
| **Client tools** | Your application | User-defined functions, bash, text_editor | Yes -- parse `tool_use`, execute, send `tool_result` |
| **Server tools** | Anthropic infrastructure | web_search, code_execution, web_fetch, tool_search | No -- results appear directly in response |

### Defining Tools (TypeScript)

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  tools: [
    {
      name: "get_weather",
      description: "Get the current weather in a given location. Returns temperature in the specified unit. Use when the user asks about current weather conditions.",
      input_schema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA"
          },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            description: "The unit of temperature"
          }
        },
        required: ["location"]
      },
      // Optional: concrete input examples for complex tools
      input_examples: [
        { location: "San Francisco, CA", unit: "fahrenheit" },
        { location: "Tokyo, Japan", unit: "celsius" }
      ]
    }
  ],
  messages: [{ role: "user", content: "What's the weather in SF?" }]
});
```

### Tool Definition Best Practices

- **Detailed descriptions are the single most important factor.** Aim for 3-4+ sentences explaining what the tool does, when to use it, what each parameter means, and any caveats.
- **Consolidate related operations** into fewer tools with an `action` parameter (e.g., one `github` tool with actions) rather than many small tools.
- **Use meaningful namespacing** in tool names: `github_list_prs`, `slack_send_message`.
- **Return only high-signal information** from tools -- include stable identifiers, not bloated payloads.
- **Use `input_examples`** for complex tools with nested objects or format-sensitive inputs. Cost: ~20-50 tokens for simple examples, ~100-200 for complex.
- **Use `strict: true`** on tool definitions to guarantee schema-valid tool inputs via constrained decoding.

### The Agentic Loop (Manual Implementation)

When Claude calls a client tool, it returns `stop_reason: "tool_use"`. You must:

1. Extract `name`, `id`, and `input` from the `tool_use` block
2. Execute the tool in your code
3. Send back a `tool_result` message
4. Repeat until `stop_reason` is `"end_turn"`

```typescript
// Complete agentic loop pattern
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: userQuery }
];

let response = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 4096,
  tools: toolDefinitions,
  messages
});

// Loop until Claude is done calling tools
while (response.stop_reason === "tool_use") {
  // Collect all tool_use blocks from this response
  const toolUseBlocks = response.content.filter(
    (block) => block.type === "tool_use"
  );

  // Execute each tool and collect results
  const toolResults = [];
  for (const toolUse of toolUseBlocks) {
    const result = await executeMyTool(toolUse.name, toolUse.input);
    toolResults.push({
      type: "tool_result" as const,
      tool_use_id: toolUse.id,
      content: JSON.stringify(result)
    });
  }

  // Add assistant response and tool results to conversation
  messages.push({ role: "assistant", content: response.content });
  messages.push({ role: "user", content: toolResults });

  // Continue the conversation
  response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    tools: toolDefinitions,
    messages
  });
}

// Final text response
const finalText = response.content
  .filter((block) => block.type === "text")
  .map((block) => block.text)
  .join("");
```

### Tool Runner (SDK Abstraction)

The Anthropic SDK provides a Tool Runner that automates the agentic loop. Available in Python, TypeScript, and Ruby SDKs. The tool runner:
- Keeps going until Claude signals `stop_reason: "end_turn"`
- Automatically collects tool calls, executes them, and sends results back
- Catches tool exceptions and returns them with `is_error: true`
- Yields messages as they arrive for streaming-friendly consumption

### Error Handling

- **Tool execution errors:** Return `is_error: true` with a descriptive error message. Write instructive messages: `"Rate limit exceeded. Retry after 60 seconds."` not `"failed"`.
- **Invalid tool calls:** Claude will retry 2-3 times with corrections. Use `strict: true` to eliminate entirely.
- **Server tool errors:** Handled transparently by Anthropic. No action needed.

### Tool Choice Options

| Value | Behavior |
|-------|----------|
| `auto` | Claude decides whether to call tools (default when tools provided) |
| `any` | Claude must use one of the provided tools |
| `tool` | Forces a specific tool: `{ type: "tool", name: "get_weather" }` |
| `none` | Prevents tool use (default when no tools provided) |

**Note:** `any` and `tool` are NOT compatible with extended thinking. Only `auto` and `none` work with extended thinking.

---

## 2. Structured Outputs

**Confidence: HIGH** -- Official Anthropic documentation.

### Two Complementary Features

1. **JSON outputs** (`output_config.format`): Constrains Claude's entire response to a JSON schema
2. **Strict tool use** (`strict: true`): Guarantees tool input schema validation

### JSON Structured Output (TypeScript)

```typescript
const response = await client.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: "Extract the key information from this email: John Smith (john@example.com) is interested in our Enterprise plan."
    }
  ],
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          plan_interest: { type: "string" },
          demo_requested: { type: "boolean" }
        },
        required: ["name", "email", "plan_interest", "demo_requested"],
        additionalProperties: false
      }
    }
  }
});

// Guaranteed valid JSON -- no try/catch needed for parsing
const data = JSON.parse(response.content[0].text);
```

### Supported Models

Structured outputs (GA) on Claude API and Amazon Bedrock:
- Claude Opus 4.6
- Claude Sonnet 4.6
- Claude Sonnet 4.5
- Claude Opus 4.5
- Claude Haiku 4.5

### Migration Note

The parameter moved from `output_format` (beta) to `output_config.format` (GA). The beta header `structured-outputs-2025-11-13` is no longer required. Old format continues working during transition.

---

## 3. Multi-Agent Orchestration

**Confidence: HIGH** -- Based on Anthropic's official engineering blog and published architecture patterns.

### Anthropic's Five Composable Patterns

Use these patterns WITHOUT frameworks like LangChain. Start simple and add complexity only when needed.

#### Pattern 1: Prompt Chaining
**When:** Tasks decomposable into fixed sequential steps.
**How:** LLM call -> programmatic validation gate -> next LLM call.
**Example:** Generate marketing copy -> translate -> quality review.

```typescript
// Prompt chaining pattern
async function promptChain(input: string) {
  // Step 1: Generate
  const draft = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: `Write marketing copy for: ${input}` }]
  });
  const draftText = draft.content[0].text;

  // Gate: Validate
  if (draftText.length < 50) throw new Error("Draft too short");

  // Step 2: Refine
  const refined = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: `Improve this copy for clarity and engagement:\n\n${draftText}` }]
  });
  return refined.content[0].text;
}
```

#### Pattern 2: Routing
**When:** Complex inputs needing different handling strategies.
**How:** Classifier LLM -> route to specialized handler.
**Example:** Route customer queries to QA, refund, or technical support handlers.

```typescript
async function routeQuery(query: string) {
  // Classify the query
  const classification = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 50,
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["technical", "billing", "general"] }
          },
          required: ["category"],
          additionalProperties: false
        }
      }
    },
    messages: [{ role: "user", content: `Classify this query: "${query}"` }]
  });

  const { category } = JSON.parse(classification.content[0].text);

  // Route to specialized handler
  const systemPrompts = {
    technical: "You are a technical support specialist...",
    billing: "You are a billing support specialist...",
    general: "You are a general customer support agent..."
  };

  return client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompts[category],
    messages: [{ role: "user", content: query }]
  });
}
```

#### Pattern 3: Parallelization
**When:** Independent subtasks needing speed or multiple perspectives.
**Variants:**
- **Sectioning:** Split task into independent subtasks, run in parallel, aggregate.
- **Voting:** Run same task multiple times with different prompts, compare outputs.

```typescript
// Sectioning: parallel independent analysis
async function parallelAnalysis(document: string) {
  const [sentiment, entities, summary] = await Promise.all([
    client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [{ role: "user", content: `Analyze sentiment of: ${document}` }]
    }),
    client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: `Extract named entities from: ${document}` }]
    }),
    client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [{ role: "user", content: `Summarize in 2 sentences: ${document}` }]
    })
  ]);

  return { sentiment, entities, summary };
}
```

#### Pattern 4: Orchestrator-Workers
**When:** Complex, unpredictable subtasks where you cannot predefine the subtask breakdown.
**How:** Central LLM decomposes task dynamically, delegates to workers, synthesizes.
**Key distinction from parallelization:** Subtasks are NOT predefined -- the orchestrator determines them based on specific input.

```typescript
async function orchestratorWorkers(task: string) {
  // Orchestrator determines subtasks
  const plan = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  context: { type: "string" }
                },
                required: ["description", "context"],
                additionalProperties: false
              }
            }
          },
          required: ["subtasks"],
          additionalProperties: false
        }
      }
    },
    messages: [{ role: "user", content: `Break this task into subtasks: ${task}` }]
  });

  const { subtasks } = JSON.parse(plan.content[0].text);

  // Workers execute subtasks in parallel
  const workerResults = await Promise.all(
    subtasks.map((subtask) =>
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: `${subtask.description}\n\nContext: ${subtask.context}` }]
      })
    )
  );

  // Synthesize results
  const synthesis = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `Original task: ${task}\n\nSubtask results:\n${workerResults.map((r, i) =>
        `### Subtask ${i + 1}: ${subtasks[i].description}\n${r.content[0].text}`
      ).join("\n\n")}\n\nSynthesize these results into a comprehensive response.`
    }]
  });

  return synthesis.content[0].text;
}
```

#### Pattern 5: Evaluator-Optimizer
**When:** Iterative refinement with clear success criteria.
**How:** Generator LLM -> Evaluator LLM (feedback loop) -> refined output.

### Anthropic's Multi-Agent Research System (Real-World Example)

Anthropic published their own multi-agent architecture (March 2025):

- **Lead agent:** Claude Opus 4 -- plans strategy, decomposes queries, spawns 3-5 subagents in parallel
- **Subagents:** Claude Sonnet 4 -- execute specialized research tasks independently
- **Key metrics:** Tool-level parallelization (3+ tools in parallel) cut research time by up to 90%
- **Token overhead:** Multi-agent uses ~15x more tokens than single-turn but delivers proportionally higher performance
- **80% of performance variance** comes from token usage; model choice is secondary

### Key Principles for Agent Design

1. **Start simple.** Optimize single LLM calls with retrieval and examples FIRST. Add agents only when this demonstrably improves outcomes.
2. **Simplicity over complexity.** Minimal design complexity reduces debugging difficulty.
3. **Transparency.** Show agent planning steps for interpretability.
4. **Tool descriptions matter as much as prompts.** Invest in clear, distinct tool descriptions.
5. **Embed scaling rules.** Agents struggle to judge appropriate effort -- encode scaling heuristics in prompts.
6. **Each subagent needs:** An objective, an output format, tool/source guidance, and clear task boundaries.

---

## 4. Streaming Responses

**Confidence: HIGH** -- Official Anthropic documentation.

### SSE (Server-Sent Events) -- The Standard

SSE is the de facto standard for LLM streaming. It is what Anthropic, OpenAI, and most LLM APIs use natively. Use SSE over WebSockets for Claude streaming -- it is simpler, built-in, and the protocol Claude's API uses.

### TypeScript SDK Streaming

```typescript
// Stream text as it arrives
const stream = client.messages.stream({
  model: "claude-opus-4-6",
  max_tokens: 4096,
  messages: [{ role: "user", content: "Hello" }]
});

stream.on("text", (text) => {
  process.stdout.write(text);
});

// Or iterate over text_stream
for await (const text of stream.textStream) {
  process.stdout.write(text);
}

// Get the final accumulated message
const message = await stream.finalMessage();
```

### SSE Event Flow

1. `message_start` -- contains a `Message` object with empty `content`
2. For each content block:
   - `content_block_start`
   - One or more `content_block_delta` events
   - `content_block_stop`
3. `message_delta` -- top-level changes (cumulative token counts)
4. `message_stop` -- stream complete

### Content Block Delta Types

**Text delta:**
```json
{
  "type": "content_block_delta",
  "index": 0,
  "delta": { "type": "text_delta", "text": "ello frien" }
}
```

**Tool use input JSON delta** (partial JSON strings):
```json
{
  "type": "content_block_delta",
  "index": 1,
  "delta": { "type": "input_json_delta", "partial_json": "{\"location\": \"San Fra" }
}
```

### Backend Pattern: Express + SSE for React/React Native Frontends

```typescript
// Express backend -- proxy Claude streaming to frontend
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const client = new Anthropic();

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages
  });

  stream.on("text", (text) => {
    res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
  });

  stream.on("end", () => {
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  });

  stream.on("error", (error) => {
    res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
    res.end();
  });
});
```

### React Frontend: Consuming SSE Stream

```typescript
// React hook for consuming Claude SSE stream
function useClaudeStream() {
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (messages: Message[]) => {
    setIsStreaming(true);
    setResponse("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n\n").filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = JSON.parse(line.slice(6));

        if (data.type === "text") {
          setResponse((prev) => prev + data.text);
        } else if (data.type === "done") {
          setIsStreaming(false);
        }
      }
    }
  };

  return { response, isStreaming, sendMessage };
}
```

### React Native Considerations

React Native does not natively support `EventSource`. Options:
- Use `fetch` with `ReadableStream` as shown above (works in React Native 0.72+)
- Use `react-native-sse` polyfill for EventSource API
- Use WebSocket as a transport layer between your backend and the mobile app (your backend still uses SSE to Claude)

### Key Streaming Notes

- The `.stream()` method keeps the HTTP connection alive with SSE
- `.finalMessage()` (TypeScript) or `.get_final_message()` (Python) accumulates all events and returns the complete Message
- Token counts in `message_delta` are cumulative, not incremental
- For large `max_tokens` values, the SDK **requires** streaming to avoid HTTP timeouts
- Tool use content blocks also stream with `input_json_delta` events -- accumulate partial JSON strings and parse on `content_block_stop`

---

## 5. RAG with Claude

**Confidence: HIGH** -- Based on Anthropic's official contextual retrieval research and documentation.

### Anthropic's Contextual Retrieval Approach

Standard RAG chunks documents and embeds them in isolation, losing context. Anthropic's contextual retrieval prepends explanatory context to each chunk before embedding, dramatically improving retrieval quality.

### Performance Improvements

| Approach | Retrieval Failure Rate | Reduction |
|----------|----------------------|-----------|
| Standard RAG | 5.7% | baseline |
| Contextual Embeddings alone | 3.7% | -35% |
| Contextual Embeddings + BM25 | 2.9% | -49% |
| Contextual + BM25 + Reranking | 1.9% | -67% |

### Implementation Steps

1. **Chunk documents** into ~800 token chunks with 10-20% overlap between adjacent chunks
2. **Generate contextual descriptions** for each chunk using Claude:

```typescript
// Generate context for each chunk (use Haiku for cost efficiency)
async function addContextToChunk(chunk: string, fullDocument: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `<document>\n${fullDocument}\n</document>\n\nHere is the chunk we want to situate within the whole document:\n<chunk>\n${chunk}\n</chunk>\n\nPlease give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`
    }]
  });
  // Prepend context to chunk before embedding
  return `${response.content[0].text}\n\n${chunk}`;
}
```

3. **Create embeddings** from contextualized chunks
4. **Create BM25 index** from the same contextualized chunks (for lexical matching)
5. **At query time:** Run both semantic search and BM25 in parallel
6. **Rank fusion:** Combine and deduplicate results from both methods
7. **Pass top-K chunks** to Claude as context for generation

### Chunk Sizing Best Practices

- **Target:** ~800 tokens per chunk (Anthropic's recommended size)
- **Overlap:** 10-20% between adjacent chunks to maintain context continuity
- **Context prefix:** Usually 50-100 tokens per chunk (generated by Claude)
- **Cost optimization:** Use prompt caching to reduce cost of generating contextual descriptions by up to 90%

### Context Window Strategy

Claude models have large context windows (200K tokens). Best practices:

- **Do not stuff the entire context window.** More context is not always better -- relevance matters more than volume.
- **Top-K retrieval:** Retrieve 10-20 most relevant chunks, not 100.
- **Place retrieved context at the beginning** of the system prompt or user message.
- **Use XML tags** to clearly delineate retrieved context from instructions:

```typescript
const systemPrompt = `You are a helpful assistant. Answer based on the provided context.

<retrieved_context>
${topChunks.map((c, i) => `<chunk index="${i + 1}">\n${c.content}\n</chunk>`).join("\n")}
</retrieved_context>

If the context doesn't contain enough information to answer, say so.`;
```

### Embedding Model Recommendations

| Model | Dimensions | Best For | Notes |
|-------|-----------|----------|-------|
| OpenAI text-embedding-3-small | 1536 | General purpose, good cost/quality tradeoff | Most popular choice |
| OpenAI text-embedding-3-large | 3072 | Maximum quality, higher cost | Best accuracy |
| Voyage AI voyage-3 | 1024 | Anthropic-recommended partner | Optimized for Claude |
| gte-small (local) | 384 | Edge functions, no API dependency | Built into Supabase Edge Functions |

**Critical rule:** Always use the SAME embedding model for all comparisons. Comparing embeddings from different models yields meaningless results.

---

## 6. Supabase pgvector

**Confidence: HIGH** -- Official Supabase documentation.

### Setup

```sql
-- Enable the pgvector extension
create extension vector with schema extensions;

-- Create a documents table with embeddings
create table documents (
  id bigint primary key generated always as identity,
  content text not null,
  metadata jsonb,
  embedding extensions.vector(1536)  -- Match your model's dimensions
);
```

### Distance Operators

| Operator | Metric | When to Use |
|----------|--------|-------------|
| `<=>` | Cosine distance | **Default choice** -- safe when unsure if embeddings are normalized |
| `<#>` | Negative inner product | Use with normalized embeddings (e.g., OpenAI) -- slightly faster |
| `<->` | Euclidean distance | Rarely preferred for text embeddings |

### Match Function

```sql
create or replace function match_documents (
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int
)
returns setof documents
language sql
as $$
  select *
  from documents
  where documents.embedding <=> query_embedding < 1 - match_threshold
  order by documents.embedding <=> query_embedding asc
  limit least(match_count, 200);
$$;
```

### Calling from supabase-js

```typescript
const { data: documents } = await supabase.rpc("match_documents", {
  query_embedding: embedding,  // Your query vector
  match_threshold: 0.78,       // Similarity threshold
  match_count: 10              // Max results
});
```

### HNSW Index (Recommended Default)

HNSW (Hierarchical Navigable Small World) should be your default index choice. It uses proximity graphs with O(log n) average complexity for search and insertion.

```sql
-- Create HNSW index for cosine distance (most common)
create index on documents
  using hnsw (embedding vector_cosine_ops);

-- For inner product (use with normalized embeddings)
create index on documents
  using hnsw (embedding vector_ip_ops);

-- For L2/Euclidean distance
create index on documents
  using hnsw (embedding vector_l2_ops);
```

**HNSW advantages:**
- Safe to build immediately after table creation (unlike IVFFlat)
- Automatically maintains optimal structure as new data arrives
- Higher recall than IVFFlat
- Better for dynamic datasets

### IVFFlat Index (Alternative)

Use IVFFlat when memory is constrained or you have a very large, mostly-static dataset.

```sql
-- IVFFlat index (build AFTER data is loaded)
create index on documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);  -- lists = rows/1000 for demos, rows/200 for production
```

**IVFFlat limitations:**
- Must be built AFTER data is loaded (empty table = bad index)
- Requires periodic reindexing as data changes
- Lower recall than HNSW

### When to Index

| Row Count | Recommendation |
|-----------|---------------|
| < 100K | Sequential scan is fine, no index needed |
| 100K - 50M | HNSW index (default) or IVFFlat |
| > 50M | Consider a dedicated vector database |

### Complete RAG Table Schema

```sql
-- Production-ready schema for RAG with pgvector
create extension if not exists vector with schema extensions;

create table documents (
  id bigint primary key generated always as identity,
  content text not null,
  context_summary text,  -- Contextual retrieval prefix
  metadata jsonb default '{}',
  embedding extensions.vector(1536),
  created_at timestamptz default now()
);

-- HNSW index for fast similarity search
create index documents_embedding_idx on documents
  using hnsw (embedding vector_cosine_ops);

-- Index on metadata for filtered queries
create index documents_metadata_idx on documents
  using gin (metadata);

-- Full-text search index for BM25-style hybrid search
alter table documents add column fts tsvector
  generated always as (to_tsvector('english', content)) stored;
create index documents_fts_idx on documents using gin (fts);

-- Match function with metadata filtering
create or replace function match_documents_filtered (
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int,
  filter_metadata jsonb default '{}'
)
returns table (
  id bigint,
  content text,
  context_summary text,
  metadata jsonb,
  similarity float
)
language sql
as $$
  select
    id,
    content,
    context_summary,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where
    embedding <=> query_embedding < 1 - match_threshold
    and metadata @> filter_metadata
  order by embedding <=> query_embedding asc
  limit least(match_count, 200);
$$;

-- Hybrid search: combine vector similarity with full-text search
create or replace function hybrid_search (
  query_text text,
  query_embedding extensions.vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float,
  text_rank float
)
language sql
as $$
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity,
    ts_rank(d.fts, websearch_to_tsquery('english', query_text)) as text_rank
  from documents d
  where
    d.embedding <=> query_embedding < 1 - match_threshold
    or d.fts @@ websearch_to_tsquery('english', query_text)
  order by
    (1 - (d.embedding <=> query_embedding)) * 0.7
    + ts_rank(d.fts, websearch_to_tsquery('english', query_text)) * 0.3
    desc
  limit least(match_count, 200);
$$;
```

---

## Common Pitfalls

### Pitfall 1: Over-Engineering Agent Architecture
**What goes wrong:** Developers reach for multi-agent orchestration or frameworks like LangChain before optimizing single-call patterns.
**How to avoid:** Start with a single Claude call + good prompt + retrieval. Add agents ONLY when this demonstrably fails.

### Pitfall 2: Not Using Structured Outputs
**What goes wrong:** Relying on prompt engineering to get JSON, then writing brittle parsing code with try/catch for malformed responses.
**How to avoid:** Use `output_config.format` with `json_schema` type. Use `strict: true` on tool definitions. Both use constrained decoding for guaranteed schema compliance.

### Pitfall 3: Embedding Model Mismatch
**What goes wrong:** Using one embedding model for indexing and a different one for querying, or switching models mid-project.
**How to avoid:** Choose your embedding model once and use it consistently. If you switch models, you MUST re-embed all existing documents.

### Pitfall 4: Not Streaming for User-Facing Applications
**What goes wrong:** Using `.create()` (non-streaming) for chat UIs, causing users to wait 5-30 seconds with no feedback.
**How to avoid:** Always use `.stream()` for user-facing interfaces. Stream text deltas to the frontend via SSE.

### Pitfall 5: Ignoring Context Quality in RAG
**What goes wrong:** Embedding raw chunks without context, leading to poor retrieval (especially for chunks that reference "it", "the above", etc.).
**How to avoid:** Implement Anthropic's contextual retrieval -- prepend a short context description to each chunk before embedding.

### Pitfall 6: Missing HNSW Indexes on Vector Tables
**What goes wrong:** Sequential scan on vector columns works fine in dev but becomes unusable past 100K rows.
**How to avoid:** Add HNSW index early. Unlike IVFFlat, HNSW can be created on empty tables and maintains itself as data grows.

---

## State of the Art (2026)

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `output_format` (beta) | `output_config.format` (GA) | Structured outputs now stable, no beta header needed |
| Manual JSON parsing with retry loops | Constrained decoding via `json_schema` | Guaranteed valid JSON, no retries |
| LangChain/LangGraph for agent orchestration | Anthropic SDK direct + composable patterns | Less abstraction overhead, clearer debugging |
| Standard RAG (chunk + embed) | Contextual retrieval (context + embed + BM25 hybrid) | 67% reduction in retrieval failures |
| IVFFlat indexes | HNSW indexes (default) | Better recall, no rebuild needed, dynamic data support |
| Web search as beta feature | `web_search_20260209` server tool (GA) | No beta header, automatic execution |
| Manual agentic loop | Tool Runner SDK abstraction | Automatic tool execution, error handling, streaming |

**New tools to consider:**
- **Anthropic Agent SDK** -- Published alongside Claude 4.6. Full agent framework with constitutional AI safety built in.
- **Supabase Automatic Embeddings** -- Supabase can now auto-generate embeddings via Edge Functions, reducing pipeline code.
- **Anthropic Tool Search** -- Server-side tool that enables access to thousands of tools without consuming context window.

**Deprecated/outdated:**
- `anthropic-beta: structured-outputs-2025-11-13` header -- no longer needed
- `output_format` parameter -- migrated to `output_config.format`
- Claude Sonnet 3.7 and Claude Opus 3 -- officially deprecated

---

## Open Questions

1. **Anthropic Agent SDK maturity for production TypeScript apps**
   - What we know: SDK was published alongside Claude 4.6, supports constitutional AI safety
   - What is unclear: Production readiness, community adoption, comparison to raw SDK patterns
   - Recommendation: Evaluate for new projects, but raw SDK + composable patterns remain safe

2. **Optimal reranking strategy for hybrid search**
   - What we know: Reranking adds 67% improvement (vs 49% without), Cohere Rerank is popular
   - What is unclear: Best reranking model to pair with Claude in 2026, Supabase-native reranking options
   - Recommendation: Start with hybrid search (vector + BM25) without reranking, add reranker when retrieval quality plateaus

3. **Supabase pgvector scaling beyond 10M rows**
   - What we know: HNSW indexes work well to ~50M vectors, then dedicated vector DB recommended
   - What is unclear: Exact performance cliffs, Supabase-specific memory limits per plan
   - Recommendation: Monitor query latency; plan migration path to Pinecone/Weaviate if approaching 50M

---

## Sources

### Primary (HIGH confidence)
- [Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) -- Official Anthropic docs
- [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use) -- Tool definition and examples
- [Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls) -- Agentic loop, tool_result format
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- JSON schema, strict mode
- [Streaming Messages](https://platform.claude.com/docs/en/build-with-claude/streaming) -- SSE events, SDK streaming
- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) -- Five composable patterns
- [Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system) -- Orchestrator-workers at scale
- [Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval) -- RAG methodology
- [Supabase Semantic Search](https://supabase.com/docs/guides/ai/semantic-search) -- pgvector setup, match functions
- [Supabase HNSW Indexes](https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes) -- Index creation and tuning

### Secondary (MEDIUM confidence)
- [Supabase AI & Vectors overview](https://supabase.com/docs/guides/ai) -- General pgvector ecosystem
- [Supabase Automatic Embeddings](https://supabase.com/docs/guides/ai/automatic-embeddings) -- Auto-embedding feature

### Tertiary (LOW confidence)
- Community blog posts on React Native + SSE patterns (needs validation per specific RN version)

---

## Metadata

**Confidence breakdown:**
- Tool use API: HIGH -- official Anthropic docs, verified code examples
- Structured outputs: HIGH -- official docs with migration notes
- Multi-agent patterns: HIGH -- Anthropic engineering blog with real-world system details
- Streaming: HIGH -- official docs with all SSE event types documented
- RAG: HIGH -- Anthropic's published research with quantified improvements
- Supabase pgvector: HIGH -- official Supabase docs with verified SQL

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (30 days -- APIs are stable but evolving)
