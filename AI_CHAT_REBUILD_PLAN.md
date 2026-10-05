# Rebuilding the Myrri AI Chat — Research & Recommendation

> Companion to [`AI_CHAT_HARNESS.md`](./AI_CHAT_HARNESS.md), which documents how the current
> hand-rolled harness works and lists its 16 weaknesses. This document answers: **what should
> we build instead, and what can we adopt off the shelf?**
>
> Researched October 2026. Every claim below is sourced in §2. Items I could **not** verify
> from a primary source are explicitly marked **[verify]**.

---

## 1. Recommendation (TL;DR)

**Adopt Vercel AI SDK v6 as the harness and Callstack's `react-native-ai` as the on-device
provider layer. Delete our JSON protocol and agent loop. Keep our tool handlers, prompts,
and data services — they are the valuable part and they port almost unchanged.**

This turns the current situation — a bespoke text protocol the model has to learn, no
streaming, no schema validation, no context management — into a standard, typed, streaming
tool-loop with per-model native tool calling, plus proper human-in-the-loop approval that
we already half-built by hand.

| Concern | Today | With AI SDK v6 + react-native-ai |
|---|---|---|
| Tool calling | hand-rolled JSON-in-text, parsed with a brace scanner | provider-native tool calls, or constrained decoding on-device |
| Tool input validation | none (except plan tools) | **Zod `inputSchema`** per tool, validated before `execute` |
| Agent loop | `MAX_TURNS = 18` in `createChatSession` | `ToolLoopAgent` / `stopWhen` |
| Streaming | typewriter simulation over a completed reply | real token streaming |
| Approvals (delete/edit) | custom `earlyExit` + `pendingApproval` plumbing | built-in `toolApproval` (`'user-approval'`) |
| History/context | full transcript every turn, no trimming | context-management hooks (`prepareStep`, message pruning) |
| Local models | 0.5B/1B GGUF + JSON protocol | same GGUFs, **native tool templates + GBNF/JSON-schema constrained output** |
| On-device "no download" tier | two hand-written native modules (`modules/apple-llm`, `modules/gemini-nano`) | maintained packages: Apple Foundation Models (iOS), Gemini Nano via ADK (Android) |
| Retrieval (RAG) | keyword scoring only (goal library) | embeddings from the same providers (`embed()`), vector search in SQLite |

### 1.1 Verified version pins (checked against the npm registry, Oct 2026)

**Do not run `npm i ai`.** `ai@latest` is now **7.0.127**, whose provider spec is
`@ai-sdk/provider@4.x` — while `react-native-ai@0.12.x` is built against
`@ai-sdk/provider@^3.0.5`, which is the **v6** line. Installing the default `ai` version will
produce an incompatible provider interface.

```bash
# the coherent set
npm i ai@6.0.300                      # dist-tag: ai-v6  (NOT latest)
npm i zod@^4                          # satisfies ai (^3.25.76 || ^4.1.8) and react-native-ai (^4.0.0)
npm i @react-native-ai/llama@0.12.0 @react-native-ai/apple@0.12.0 @react-native-ai/adk@0.12.1
# react-native-blob-util comes in transitively via @react-native-ai/llama — no explicit install needed
```

| Package | Version to use | Evidence |
|---|---|---|
| `ai` | **6.0.300** (dist-tag `ai-v6`) | `ai@6.0.300` → `@ai-sdk/provider@3.0.18`; `ai@7.0.127` → `provider@4.0.21` |
| `@react-native-ai/{llama,apple,adk}` | 0.12.0 / 0.12.0 / 0.12.1 | `@react-native-ai/llama` deps: `@ai-sdk/provider@^3.0.5`, `@ai-sdk/provider-utils@^4.0.1`, `zod@^4.0.0` |
| `zod` | 4.x | below 4 is rejected by both `ai@6` (`^3.25.76 \|\| ^4.1.8`) and react-native-ai (`^4.0.0`) |
| `llama.rn` | 0.12.6 — **already installed** | react-native-ai peer is `^0.10.1` ✓ |
| `react-native` | ≥0.76 — we're on **0.81.5** ✓ | RN-AI peer range |

Also confirmed against the **installed** `llama.rn` types (`node_modules/llama.rn/lib/typescript/`),
not just its README — our current version already supports native tool calling and constrained
decoding:

| Capability | Where | Meaning for us |
|---|---|---|
| `tools?: object`, `tool_choice?: string` | `index.d.ts`, `types.d.ts` | real tool calls from GGUF models via the chat template — no JSON-in-text protocol |
| `json_schema?: string` (`type: 'json_schema'`) | `index.d.ts:56`, `types.d.ts:176` | *"JSON schema for convert to grammar for structured JSON output"* — syntax-guaranteed JSON |
| `grammar?: string`, `grammar_lazy`, `grammar_triggers` | `types.d.ts:180-216` | raw GBNF, plus lazy triggering for selective constraint |

**Consequence: the local tier can be upgraded with zero new dependencies.** `@react-native-ai/llama`
is therefore *optional* — what it adds is AI SDK provider compatibility, `textEmbeddingModel()`,
and the HuggingFace download helper. That de-risks the migration: if the RN-AI adoption slips,
Phase 2 still ships native tool calling on a llama.rn we already ship.

**Two things to understand before committing:**

1. We are **not** adding a backend. The AI SDK runs *in the app*; BYOK keys stay in
   `expo-secure-store`; on-device providers never send anything anywhere. This preserves the
   product's offline/no-account story exactly.
2. **Version pairing is mandatory:** `react-native-ai` **≥ 0.12** requires **AI SDK v6**
   (0.11 and below pair with v5). Pin both.

---

## 2. What the research found (sources)

| Source | What it establishes | Why it matters here |
|---|---|---|
| [ai-sdk.dev — Expo quickstart](https://ai-sdk.dev/docs/getting-started/expo) | First-party Expo guide: install `ai`, use `fetch` from **`expo/fetch`** to enable streaming; requires **Expo 52+**; `useChat` + `DefaultChatTransport` on the client | Our app is Expo 54 → streaming is available. Confirms RN is a supported target, not a hack |
| [ai-sdk.dev — Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) | `tool({ description, inputSchema: z.object(…), execute })`; per-tool `strict: true`; `stopWhen: isStepCount(n)`; **`toolApproval`** (`'user-approval'`, `'approved'`, `'denied'`, generic callback) | Replaces the JSON protocol, the allowlist, `MAX_TURNS`, and the `pendingApproval` plumbing. Note: manual approval is a **two-call** flow (request, then response) |
| [ai-sdk.dev — Agents](https://ai-sdk.dev/docs/agents/overview) | `ToolLoopAgent` = model + tools + loop (context management, stopping conditions); recommended over raw `generateText`/`streamText` for agents; `runtimeContext`/`toolsContext` for non-prompt state | Our app has two agents (health coach, nutrition logger). This maps to two `ToolLoopAgent` instances |
| [Vercel — AI SDK 6](https://vercel.com/blog/ai-sdk-6) (Dec 2025) | Agents, **tool execution approval**, DevTools, full MCP support, reranking | The features we need all landed in v6; v5 would be a worse fit |
| [github.com/callstackincubator/ai](https://github.com/callstackincubator/ai) | `react-native-ai` providers: **Apple** (Foundation Models — built-in, iOS 26+, *no download*; also NLContextualEmbedding **embeddings**, transcription, TTS), **Llama** (`llama.rn`, GGUF, embeddings), **MLC**; AI SDK v5/v6 pairing table | This is the "plug in an open-source agent and modify" answer for the *local* tier — and it replaces our two hand-written native modules |
| [react-native-ai.dev — ADK getting started](https://www.react-native-ai.dev/docs/adk/getting-started) | `@react-native-ai/adk` wraps Google's **Android ADK** as an AI SDK provider; default export targets **on-device Gemini Nano** (`gemini-nano`) | Gives Android the same "instant, no download" tier that Apple has on iOS — closing our current gap where Android users must download a GGUF |
| [github.com/mybigday/llama.rn](https://github.com/mybigday/llama.rn) | **Tool Calling** via Jinja templates (minja); **Grammar Sampling: GBNF + JSON schema**; `context.embedding()`, `context.rerank()`; v0.10+ requires New Architecture; ships an Expo config plugin | Even if we keep GGUFs, we no longer need a text protocol — and constrained decoding makes small models reliable. **`rerank` is free retrieval quality** |
| [Apple — Expanding generation with tool calling](https://developer.apple.com/documentation/foundationmodels/expanding-generation-with-tool-calling) + [Foundation Models](https://developer.apple.com/documentation/foundationmodels) | iOS 26 framework with **tool calling** and **guided generation** (`@Generable`) for structured output, on-device + Private Cloud Compute; WWDC 2026 session 339 covers bringing **your own LLM provider** to the framework | Confirms the iOS built-in path supports tools/structured output properly, and that Apple now has a provider protocol we could implement ourselves if needed |
| [Google — Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output) + [ML Kit GenAI](https://developers.google.com/ml-kit/genai) | Cloud Gemini: JSON-schema-constrained output; on-device Gemini Nano via ML Kit GenAI with structured output and function calling | The cloud providers we already support all have real structured output — we're currently ignoring it |
| [software-mansion-labs/react-native-rag](https://github.com/software-mansion-labs/react-native-rag) + [Margelo — Fitting RAG in Your Pocket](https://margelo.com/blog/fitting-RAG-in-your-pocket) (Aug 2026) | On-device RAG in RN: op-sqlite `VectorStore` + ExecuTorch embeddings; a working pipeline with a small Qwen2.5-0.5B GGUF | Only needed if we want *semantic* retrieval. §7 argues our first win is smaller than this |

---

## 3. The recommended stack

```
┌──────────────────────────── app/health-chat.tsx · app/food-chat.tsx ──────────────────────────┐
│  useChat (or streamText parts mapped to our own ChatBubble model)                             │
│  ↑ streamed text + tool-call/approval parts                                                   │
└───────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │  AI SDK v6 (the harness)    │  ToolLoopAgent · tool() · inputSchema (Zod)
                     │  stopWhen · toolApproval    │  message trimming · streaming · reranking
                     └──────────────┬──────────────┘
                                    │ LanguageModelV3/v2 provider interface
        ┌───────────────────────────┼─────────────────────────────┬──────────────────────────┐
        ▼                           ▼                             ▼                          ▼
  BYOK (cloud)              Apple on-device              Android on-device           Our GGUFs
  @ai-sdk/openai            @react-native-ai/apple       @react-native-ai/adk        @react-native-ai/llama
  @ai-sdk/anthropic         iOS 26+, no download         Gemini Nano, no download    llama.rn + JSON-schema
  @ai-sdk/google                                                                    constrained decoding
  @ai-sdk/openai-compatible (OpenRouter)
        └────────── all HTTP via expo/fetch (streaming) ──────────┘                          │
                                    │                                                        │
                     ┌──────────────▼─────────────────────────────────────────────────────────▼──┐
                     │  OUR TOOLS — unchanged in spirit (src/services/*)                        │
                     │  health.ts · foodDatabase.ts · journal.ts · coachPlan.ts · goalLibrary.ts │
                     └──────────────────────────────────────────────────────────────────────────┘
```

### 3.1 What this concretely replaces

| File today | Fate | Notes |
|---|---|---|
| `src/services/providers/parseToolResponse.ts` | **delete** | the JSON protocol + `ALLOWED_TOOL_NAMES` dissolve into `tool()` definitions |
| `src/services/localLLM.ts` (`createChatSession`, `streamText`, `extractReplyText`, `extractMessages`) | **delete most** | loop → `ToolLoopAgent`; typewriter → real streaming; `extractMessages` → map stream parts to `DisplayMessage` |
| `src/services/providers/{byok,llamaProvider,appleBuiltin,geminiNano}.ts` | **delete** | replaced by AI SDK provider packages + `@react-native-ai/*` |
| `modules/apple-llm/`, `modules/gemini-nano/` | **delete** | replaced by `@react-native-ai/apple` / `@react-native-ai/adk` |
| `buildHealthToolHandlers()` / `buildFoodToolHandlers()` | **keep, reshape** | same bodies; wrap each in `tool({ description, inputSchema, execute })` |
| `buildCoachChatToolHandlers()` (`coachPlan.ts`) | **keep** | sanitisers still run inside `execute` — defence in depth stays |
| `HEALTH_SYSTEM_PROMPT` / `FOOD_SYSTEM_PROMPT` | **keep, shrink** | tool docs move into tool `description`s; the prompt keeps tone, rules, and guardrails |
| `assets/brand/…`, `app/settings.tsx`, onboarding AI choice | **keep** | provider picker becomes: BYOK · Apple · Gemini Nano · Llama · None |

### 3.2 Sketch: the health agent, before → after

```ts
// AFTER — one agent, typed tools, real streaming, approvals, bounded loop
import { ToolLoopAgent, tool, isStepCount } from 'ai';
import { z } from 'zod';
import { apple } from '@react-native-ai/apple';
import { llama } from '@react-native-ai/llama';
import { adk } from '@react-native-ai/adk';

const getSleep = tool({
  description: "The user's sleep for a period: hours and sleep score. Call before answering any sleep question.",
  inputSchema: z.object({
    period: z.enum(['today', 'yesterday', 'week']).default('today'),
  }),
  execute: async ({ period }) => {
    const days = period === 'week' ? 7 : 1;
    const date = period === 'yesterday' ? shiftDay(-1) : today();   // ← fixes the dateOffset bug
    return readSleep(date, days);                                    // ← our existing health.ts call
  },
});

const updatePlan = tool({
  description: 'Save or update the coaching plan. Only change what the user asked to change.',
  inputSchema: z.object({
    habitIds: z.array(z.string()).max(14).optional(),
    nutrition: z.object({
      calories: z.number().min(1200).max(6000),
      proteinG: z.number().min(40).max(400).optional(),
      carbsG: z.number().min(0).max(900).optional(),
      fatG: z.number().min(20).max(300).optional(),
    }).optional(),
    sleepHours: z.number().min(5).max(12).optional(),
    stepsPerDay: z.number().min(1000).max(30000).optional(),
    focusNote: z.string().optional(),
  }),
  execute: async (input) => saveMergedPlan(input),   // existing merge-only logic
});

export const healthAgent = new ToolLoopAgent({
  model: pickModel(),                              // BYOK | apple() | adk() | llama(modelId)
  instructions: HEALTH_SYSTEM_PROMPT,              // now much shorter — tools document themselves
  tools: { getSleep, getSteps, getHeart, getRecovery, getJournal, getMeals,
           getGoalGuidance, getPlan, updatePlan },
  stopWhen: isStepCount(8),
  toolApproval: { updatePlan: 'user-approval' },   // if we want plan writes confirmed too
});
```

Food chat is the same shape, with `logMeal` optionally moved from "writes immediately" to
`'user-approval'` — which retroactively fixes weakness #4 in the harness doc, and gives us a
principled place to recompute macros on `editMeal` (weakness #5).

### 3.3 Model selection

```ts
async function pickModel() {
  // 1. BYOK — user's key, best quality (and the only path with provider-native strict tools)
  if (await byokConfigured()) return openai(cfg.model, { apiKey: cfg.apiKey });

  // 2. Built-in system models — instant, no download
  if (Platform.OS === 'ios' && await isAppleFoundationModelAvailable()) return apple();
  if (Platform.OS === 'android' && await isGeminiNanoAvailable()) return adk();

  // 3. Downloaded GGUF — user's choice of size
  return llama.languageModel(selectedGgufId);
}
```

This replaces `selectProvider()`'s current tier order while keeping the same product
behaviour — except Android gets a no-download tier it doesn't have today.

---

## 4. How this maps onto the 16 documented weaknesses

| # | Weakness (from `AI_CHAT_HARNESS.md` §11) | Fixed by |
|---|---|---|
| 1 | No real streaming | AI SDK streaming over `expo/fetch`; llama.rn token callbacks |
| 2 | Tiny local models / JSON protocol fragility | native tool templates (llama.rn/minja, Apple tools, Nano function calling) + **GBNF/JSON-schema constrained decoding**; and the provider list now suggests 1.5–3B GGUFs |
| 3 | No context management | agent context management; use `prepareStep` + message trimming/summarisation |
| 4 | `log_meal` writes without approval, wrong-food fallback | `toolApproval`; keep the "which of these did you mean?" branch in `execute` |
| 5 | `edit_meal` leaves stale macros | recompute inside `execute` (Zod guarantees `newServingG` is a number) |
| 6 | Provenance dropped (`hrvEstimated`, sample dates) | tool return values are ours — add `{ value, source, sampleDate, estimated }` |
| 7 | `get_sleep` can't answer history | return `readSleepHistory(days)`; no more "note: historical sleep is limited" |
| 8 | Repeated expensive `getTodayData()` per call | one cached health snapshot per agent run (`runtimeContext`); tools read the snapshot |
| 9 | Prompt contradiction (one tool vs many) | tool descriptions replace prompt-listed tools; no contradiction to write |
| 10 | Apple/Nano bypass protocol hardening | they become first-class providers; validation happens in `tool()`/Zod for every provider |
| 11 | No argument validation | **Zod `inputSchema`** + provider `strict: true` where supported |
| 12 | Randomised readiness phrasing | make the summary deterministic (it's our code, not the model's) |
| 13 | Readiness written as a side effect of a tool read | split read/write: `calculateReadiness()` pure, recording done explicitly |
| 14 | Assistant history stored as raw JSON | AI SDK `UIMessage`/model-message parts — text and tool calls are separate typed fields |
| 15 | No timeouts/retries/cancellation | AI SDK retries + `abortSignal`; `stopWhen` bounds the loop |
| 16 | `"yesterday"` silently ignored | `inputSchema` enum + explicit date resolution per tool (see `shiftDay(-1)` above) |

That's all 16 addressed by the same migration — which is the main argument for doing it as one
piece of work rather than patching the current harness.

---

## 5. Migration plan (each phase independently shippable)

**Phase 0 — spike (½–1 day).** In a branch: install `ai@6` + `@ai-sdk/openai` +
`@react-native-ai/llama`; prove three things on a real device: (a) streaming chat over
`expo/fetch`, (b) a two-tool agent loop, (c) `toolApproval` round-trip. Everything else
depends on these three. Investigate the llama provider's tool/grammar options here —
**[verify]** whether `@react-native-ai/llama` surfaces llama.rn's `json_schema`/`grammar`
params, and whether `@react-native-ai/apple` exposes Apple FM tool calling.

**Phase 1 — food chat on the new stack (2–4 days).** Smallest, most testable surface:
`search_food`, `log_meal`, `get_meals`, `edit_meal`, `delete_meal` as `tool()`s with Zod.
Ship behind a flag; compare logged-meal accuracy against the current build on the same
prompts. This phase alone fixes weaknesses 4, 5, 11.

**Phase 2 — health chat (3–5 days).** Port the 13 health/coach tools; add the per-run health
snapshot cache; wire the provider picker (BYOK / Apple / ADK / Llama). Add streaming UI (can
reuse the existing `ChatBubble`; replace `streamingText` plumbing with streamed parts).

**Phase 3 — delete the old harness (1 day).** Remove `parseToolResponse.ts`,
`createChatSession`, the four provider files, and both native modules. Prune the system
prompts to tone/rules only.

**Phase 4 — retrieval upgrade (2–4 days, optional).** §7.

**Phase 5 — tests (1–2 days).** Golden-prompt suite per agent asserting *tool selection*
(the real failure mode), plus unit tests for the handlers (still pure functions).

---

## 6. What to keep, deliberately

- **The tool handlers are the product.** They encode Myrri's domain knowledge (wearable
  double-counting rules, OpenNutrition FTS5, plan sanitisers, readiness math). AI SDK doesn't
  replace any of it — it just calls it properly.
- **The prompts' *rules*.** "Never guess data", "connect the dots", "be concise" — these stay.
  Only the enumerated tool tables get deleted (tool descriptions do that job now).
- **No backend, no accounts, keys in SecureStore.** Unchanged. `scrubForCloud()` still runs
  before BYOK requests (implement it as a middleware step on the model call).
- **The bundled OpenNutrition SQLite + FTS5.** Already better than most RAG setups for
  "search a food by name".

---

## 7. RAG: what's actually worth doing

Today the only retrieval beyond SQL is the keyword scorer over `GOAL_DOCS` (§7.5 of the
harness doc). Two tiers:

**Tier 1 (cheap, do it in Phase 2/4):**
1. Move goal-library retrieval onto the **same FTS5 machinery we already ship** for foods —
   one query language, no scoring heuristics to maintain.
2. Add a **`getHealthSnapshot`** tool that returns one compact bundle (today + 7-day deltas),
   so the model stops re-calling six tools.
3. Add `sqlite-vec`-style retrieval only if user-authored text grows (journal notes are the
   likely trigger).

**Tier 2 (real semantic retrieval, when justified):**
- Embeddings are now available **on-device in the same packages**: `apple.textEmbeddingModel()`
  (NLContextualEmbedding, 512-dim) on iOS, `llama.textEmbeddingModel()` on Android, and
  `embed()` from AI SDK for cloud parity.
- Store vectors in SQLite (`op-sqlite` + sqlite-vec, as `react-native-rag` does) or brute-force
  cosine over a few hundred rows — for a personal corpus, brute force is fine.
- `llama.rn` also exposes **`context.rerank(query, documents)`** — use it to rerank FTS5 hits
  instead of building a vector pipeline at all. That's usually the 80/20 here.
- Only if we want a batteries-included pipeline: `react-native-rag` (op-sqlite VectorStore +
  ExecuTorch embeddings). Heavier native surface; adopt only if Tier 1 proves insufficient.

---

## 8. Alternatives considered

| Option | Verdict | Why |
|---|---|---|
| **A. AI SDK v6 + react-native-ai** (recommended) | ✅ | Purpose-built for exactly our situation (RN + on-device + cloud BYOK), maintained, typed, streaming, approvals, and it deletes the most code |
| **B. Keep the hand-rolled loop, fix it properly** | 🟡 viable fallback | No new deps and no version risk; but we'd re-implement streaming, schema validation, approvals, and loop control — i.e. rebuild AI SDK ourselves. Reasonable if we want zero external surface, or as an interim step: adopt *just* native tool calls + GBNF + streaming (`ToolLoopAgent` optional) |
| **C. Server-side agent framework** (Mastra, VoltAgent, LangGraph.js, OpenAI Agents SDK, Google ADK) | ❌ | They target Node/server runtimes; adopting one means adding a backend, which breaks the offline/no-account design and puts health data (or a proxy for it) on a server. Their strengths (multi-agent graphs, durable execution, tracing) are irrelevant to two single-agent mobile chats |
| **D. `react-native-rag` + ExecuTorch** | 🟡 later | Good, but it's a retrieval library, not a harness — it doesn't fix tool calling, streaming, or approvals. Consider for Tier-2 RAG only |
| **E. MLC / ExecuTorch as the local runtime** | 🟡 optional | `@react-native-ai/mlc` is a drop-in *provider* if GGUF quality/speed disappoints; ExecuTorch is the runtime behind react-native-rag. Neither is needed to fix the harness |
| **G. Upgrade llama.rn in place, skip RN-AI** | 🟡 partially viable | Our installed `llama.rn@0.12.6` already exposes `tools`/`tool_choice`/`json_schema`/`grammar` (§1.1), so the local tier can get native tool calls and constrained decoding with **no new dependency**. What we'd give up: one unified loop/provider interface, and the built-in Apple/Nano tiers. Best used as the *fallback* if RN-AI adoption stalls |
| **F. MCP** | 🟡 interesting | AI SDK 6 has full MCP support. Our tools are local and private — exposing them over MCP adds surface for no benefit today, but it's the natural path if Myrri ever connects to external data sources (labs, CGMs, smart scales) |

---

## 9. Risks & open questions

1. **Version pinning — now verified, and it bites immediately.** `npm i ai` installs **7.0.127**
   (`@ai-sdk/provider@4`), while `react-native-ai@0.12.x` is built on `@ai-sdk/provider@^3.0.5`
   (**v6**). Pin `ai@6.0.300` and add a dependency-pinning comment (or an `overrides` entry)
   next to the imports. If/when react-native-ai ships a v7-compatible release, that's the
   moment to move — not before. See §1.1 for the full verified set.
2. **Streaming in RN needs `expo/fetch`.** Node's fetch has no `response.body` in RN. This is
   documented by AI SDK's own Expo guide, so it's a known-good path — but it means any code
   doing `global.fetch` for models must switch.
3. **Tool-calling quality of small GGUFs.** Constrained decoding (JSON schema) fixes *syntax*,
   not *judgement*. Recommendation: keep 0.5B/1B as the "instant" option but steer users to
   the built-in system models (Apple FM / Gemini Nano) as the default local tier — they're
   bigger, free, and download-free. **[verify]** their context windows and tool-calling
   reliability on our two prompts during Phase 0.
4. **Apple FM / Gemini Nano availability** is device- and OS-gated (Apple Intelligence devices
   / AICore). The picker must degrade gracefully to BYOK or GGUF — our existing
   `isAvailable()` pattern already handles this.
5. **`toolApproval` is a two-call flow** (approval request, then response). This is architecturally
   different from our `earlyExit`, which returns immediately. It changes how the delete/edit
   cards behave across turns — the Phase 0 spike must validate it end-to-end before we delete
   the old path. This is the single biggest behavioural risk in the migration.
6. **Expo Go can't do any of this.** Phases 1+ require dev builds — already true today for
   HealthKit/llama.rn, so no new constraint.
7. **We're trading bespoke control for a dependency.** Mitigation: keep the tool handlers as
   plain functions (they stay testable and portable) and keep `AI_CHAT_HARNESS.md` as the
   record of the old design in case we need to fall back to Option B.

---

## 10. Decision needed

Recommended: **Option A**, phased as in §5, starting with the Phase 0 spike because it
validates the three risky assumptions (streaming in RN, on-device tool calling, approval
round-trip) before any deletion happens.
