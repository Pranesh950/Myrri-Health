# The Myrri AI Chat Harness — How It Actually Works

> Scope: everything that happens between a user typing into `app/health-chat.tsx` or
> `app/food-chat.tsx` and an answer appearing on screen — provider selection, the
> tool-calling protocol, the agent loop, every retrieval path, storage keys, context
> budgets, failure modes, and the known weaknesses.
>
> Status of this document: written from a direct read of the code at the commit it was
> added in. Line numbers are deliberately omitted (they drift); function and symbol
> names are exact so you can grep for them. Anything marked **Inferred** is a
> conclusion from reading the code, not something the code states outright.

---

## 1. Mental model

There is **no vector database, no embeddings, no cloud RAG service, and no streaming**.

The assistant is a **two-chat, tool-calling agent loop over a hand-rolled JSON text
protocol**. The model never sees the user's data directly. It emits a JSON action
(`{"action":"get_sleep","period":"week"}`) as *text*; a deterministic parser turns that
text into a function call; a locally-registered **tool handler** reads the device's real
data (HealthKit / Health Connect / bundled SQLite food DB / AsyncStorage) and returns a
JSON string; that string is appended to the model's message list as a `tool` message; the
model gets another turn. Repeat until the model emits `{"action":"reply", ...}` or the
loop hits its turn cap.

The word "harness" is accurate: the intelligence is mostly in the harness. It provides

- an **allowlist** of 17 tool names (`ALLOWED_TOOL_NAMES`),
- **argument coercion** for the few tools that need it,
- an **18-turn agent loop** with abort support (`createChatSession`),
- **display shaping** so raw JSON never reaches the user (`extractMessages`,
  `extractReplyText`),
- **simulated token streaming** so replies appear to type out (`streamText`).

Splitting the two chats matters: they share the harness and the provider layer, but they
have **completely separate system prompts and tool sets** — the health chat cannot log
food, and the food chat cannot read sleep.

```
        ┌──────────────────────────── provider layer (swappable) ─────────────────────────┐
        │ byok.ts (OpenAI · Anthropic · Gemini · OpenRouter)  │ llama.rn │ Apple LLM │ Nano │
        └───────────────────────────────────┬─────────────────────────────────────────────┘
                                            │ chat(messages) → { content, toolCalls[] }
   user text                                ▼
  ──────────► createChatSession.sendMessage ──► provider.chat ──► parseProviderResponse
                                                     ▲                    │
                                                     │              toolCalls[]
                                    role:"tool" JSON │                    ▼
                                    (tool result)    └──────────── ToolHandler (local)
                                                                          │
                                                     HealthKit / Health Connect / SQLite /
                                                          AsyncStorage plan+journal+history
                                                     ▲
                                                     └── same loop, up to 18 turns ──► reply
```

### The one-line summary of each layer

| Layer | File | Responsibility |
|---|---|---|
| Chat screens | `app/health-chat.tsx`, `app/food-chat.tsx` | system prompt, tool registry, init UI, optimistic bubbles, approval cards |
| Harness | `src/services/localLLM.ts` | provider singleton, agent loop, abort, display extraction, fake streaming |
| Protocol parser | `src/services/providers/parseToolResponse.ts` | raw text → `{content, toolCalls}`; the allowlist lives here |
| Providers | `src/services/providers/{byok,llamaProvider,appleBuiltin,geminiNano,types}.ts` | HTTP/native request + response shaping per backend |
| Retrieval | `src/services/health.ts`, `foodDatabase.ts`, `journal.ts`, `coachPlan.ts`, `goalLibrary.ts`, `insights.ts`, `readiness.ts` | the actual data reads |
| Native bridges | `modules/apple-llm/`, `modules/gemini-nano/` | thin `requireNativeModule` wrappers (`isAvailable`, `generate`) |
| Setup UI | `app/onboarding/ai-choice.tsx`, `app/onboarding/byok.tsx`, `app/settings.tsx` | choose provider, store key, pick model |

---

## 2. Provider layer

### 2.1 The choice

The user's choice is a single AsyncStorage value, `llm_provider_choice`
(`LLM_CHOICE_KEY`), read by `getLLMChoice()`:

| Stored | Meaning |
|---|---|
| `"byok"` | bring-your-own-key cloud provider |
| `"local"` | on-device model |
| `"none"` | AI off — every non-AI feature still works |
| *(missing)* | defaults to `"byok"` |
| `"puter"` | **legacy** — migrated to `"none"` on read (the Puter option was removed; a BYOK choice with no key would fail every init) |

`isAIEnabled()` is just `getLLMChoice() !== "none"`. Both chat screens check it **before**
touching the LLM, which is how the "AI is off" state avoids an error screen.
`setLLMChoice()` persists and calls `resetLLM()` so a running app picks up the change.

### 2.2 The interface

`src/services/providers/types.ts` is the whole contract:

```ts
export interface ChatMessage { role: "system" | "user" | "assistant" | "tool"; content: string; }
export interface LLMResponse {
  content: string;                                  // reply text (may be "" when tools only)
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
}
export interface LLMProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  init(): Promise<void>;
  chat(messages: ChatMessage[]): Promise<LLMResponse>;
  dispose(): Promise<void>;
  switchModel?(modelId: string): Promise<void>;
}
```

Every provider is **non-streaming**: `chat()` resolves once with the complete text.

### 2.3 Selection order and lifecycle (`initializeLLM`)

`selectProvider()` resolves the active provider from the stored choice:

- `"none"` → throws `"AI is turned off — enable it in the AI setup screen to chat."`
- `"byok"` → `byokProvider` if `isAvailable()`, else throws
  `"Bring-your-own-key isn't set up yet. …"`
- `"local"` → first available of, in order:
  1. `appleBuiltinProvider` (iOS only — Apple Foundation Model)
  2. `geminiNanoProvider` (Android only — Gemini Nano)
  3. `llamaProvider` (llama.rn + GGUF download)
  
  …else throws `"No local AI provider is available on this device. …"`

`initializeLLM()` adds two pieces of concurrency care that are easy to miss:

- **Dedupe:** a module-level `initPromise` means concurrent callers share one init.
- **Staleness guard:** a `providerGeneration` counter is bumped by `resetLLM()`. If the
  generation changed while selection/init was in flight, the freshly created provider is
  disposed and never becomes active — so switching provider mid-init cannot leak a stale
  context or send on the old path.

`ProviderInfo.status` is one of `unavailable | downloading | ready | error`, and
`getStatus().name` is what the chat header displays (e.g. `Llama (Qwen 2.5 0.5B)`,
`BYOK · OpenAI`, `Apple Foundation Model`, `Gemini Nano`). Llama starts in
`downloading` — the screens poll `getQwenDownloadProgress()` every 500 ms to draw the
progress bar.

### 2.4 Per-provider details

**`llamaProvider` (`llama.rn`)** — `name: "Llama (local)"`

| Item | Value |
|---|---|
| Models (`AVAILABLE_MODELS`) | `qwen-0.5b` — Qwen 2.5 0.5B Instruct Q4_K_M (~400 MB); `llama-1b` — Llama 3.2 1B Instruct Q4_K_M (~700 MB) |
| Download source | HuggingFace `bartowski/*-GGUF` resolve URLs |
| On-disk path | `${FileSystem.documentDirectory}models/` (`MODEL_DIR`) |
| "Downloaded" test | file exists **and** `size > 50_000_000` bytes |
| Progress | `FileSystem.createDownloadResumable` → `downloadProgressMap[modelId]` (0–1, `-1` on failure) |
| Selected model | AsyncStorage `llama_selected_model` (falls back to the first model) |
| Context | `initLlama({ n_ctx: 4096, use_mlock: true, n_gpu_layers: Platform.OS === "ios" ? 99 : 0 })` |
| Sampling | `completion({ n_predict: 800, temperature: 0.3, top_p: 0.9, stop: ["<|im_end|>","<|endoftext|>","<|eot_id|>"] })` |
| Role mapping | `tool` → `user` (llama has no tool role) |
| Parse | `parseProviderResponse(raw)` |

`switchModel()` disposes the old context, downloads if needed, and re-inits. The model
picker in both chat screens is `isLlama`-gated.

**`byokProvider`** — `name: "BYOK"`, displayed as `BYOK · <label>`

| Provider | Default model | Base URL | Endpoint |
|---|---|---|---|
| `openai` | `gpt-4o-mini` | `https://api.openai.com/v1` | `/chat/completions` |
| `anthropic` | `claude-3-5-haiku-latest` | `https://api.anthropic.com/v1` | `/messages` |
| `gemini` | `gemini-2.0-flash` | `https://generativelanguage.googleapis.com/v1beta` | `` (`/models/{model}:generateContent?key=…`) |
| `openrouter` | `openai/gpt-4o-mini` | `https://openrouter.ai/api/v1` | `/chat/completions` |

- Config lives in **expo-secure-store** under `byok_config_v1` with
  `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` (iOS) so the key never migrates
  via Keychain backup. It is never written to plaintext AsyncStorage.
- `MAX_TOKENS = 1024` on every provider. Sampling: OpenAI / OpenRouter and Gemini send `temperature: 0.3`; **Anthropic's body omits `temperature` entirely** (`{model, max_tokens, system, messages}`), so it runs at the provider's default. `top_p: 0.9` is Llama-only.
- Request shaping differs per vendor: Gemini maps to `contents[]` with
  `systemInstruction` + `generationConfig`; Anthropic uses a top-level `system` string and
  the `anthropic-version: 2023-06-01` header; OpenAI/OpenRouter put the system message
  first in `messages`.
- `mergeConsecutive()` collapses same-role turns (needed because tool results are
  rewritten as `user` messages) — for Gemini it merges `parts`, for the others it joins
  `content` with `\n\n`.
- **Every message is passed through `scrubForCloud()`** before leaving the device (see §9).
- `readJsonResponse()` pulls a human-readable error out of non-2xx bodies
  (`error.message` → `message` → raw text → `HTTP <status>`) and truncates to 300 chars.
- `testByokConnection(config)` sends `"Reply with exactly: ok"` and reports the model's
  reply — used by the BYOK setup screen's "Test connection" button.

**`appleBuiltinProvider`** — `name: "Apple Foundation Model"`

- iOS only; requires the local Expo module `modules/apple-llm` (`requireNativeModule("AppleLLMModule")`).
- Flattens the message list into a single text prompt: non-system messages become
  `"ROLE:\n<content>"` joined by blank lines, terminated with `"ASSISTANT:\n"`; system
  messages are joined and passed as the separate `systemPrompt` argument.
- Parses **one** JSON object from the result (no brace-depth scanner, no allowlist).
  `action`/`action_type` of `search`/`search_food`/`log`/`log_meal` become a tool call
  with `content: ""`; anything else returns the message text.

**`geminiNanoProvider`** — `name: "Gemini Nano"`

- Android only; requires `modules/gemini-nano` (`requireNativeModule("GeminiNanoModule")`).
- Otherwise identical in structure to the Apple provider (same flattening, same single
  action map, same lack of allowlist validation).

> **Inferred:** these two providers are a fallback tier for "local AI without a
> download". They are deliberately minimal, which is why they skip the multi-block parser
> and the allowlist — the handlers still validate what they receive, and unknown tool
> names are answered with `{"error":"Unknown tool"}` by the harness.

---

## 3. The wire protocol

The model is instructed to answer with **JSON objects in plain text**. There is no
vendor tool-calling API involved anywhere.

```jsonc
// a reply
{ "action": "reply", "message": "You slept 7.2h and your readiness is 68." }

// a food reply with structured rows for the UI
{ "action": "reply", "message": "You ate 3 items today:",
  "mealList": [{ "foodName": "Scrambled eggs", "servingGrams": 100,
                 "calories": 155, "protein": 13, "carbs": 1, "fat": 11 }] }

// a tool call
{ "action": "get_sleep", "period": "week" }
```

### 3.1 Parsing (`parseToolResponse.ts`)

`extractJsonBlocks(raw)` is a **brace-depth scanner** that walks the raw text, tracks
string/escape state, and `JSON.parse`s each top-level `{…}` it completes. This is what
makes *multiple actions in one reply* work:

```
{"action":"search","query":"chicken"}\n{"action":"search","query":"rice"}
   → two independent blocks → two tool calls
```

`parseProviderResponse(raw)` then maps blocks to an `LLMResponse`:

1. `action` / `action_type` is read from each block. Empty or `"reply"` → the block's
   `message`/`text`/`response` becomes `replyText`.
2. Aliases are normalised: `search` → `search_food`, `log` → `log_meal`.
3. Anything **not** in `ALLOWED_TOOL_NAMES` is silently dropped.
4. The envelope keys (`action`, `action_type`, `message`, `text`, `response`) are stripped
   from the args; the rest is the argument object.
5. Special cases:
   - `search_food`: `args.query` falls back to `query` / `food`.
   - `log_meal`: `fdcId` ← `fdcId || food_id` (stringified);
     `foodName` ← `foodName || food_name || name`; `servingG` ←
     `servingG || serving_grams || portion_g || 100`.
6. If any tool calls exist → `{ content: replyText, toolCalls }` (text the model wrote
   alongside a tool call is preserved and shown).
   Otherwise → `{ content: replyText }`, or `{ content: "" }` if there was nothing usable.

**`ALLOWED_TOOL_NAMES` is the security boundary** between model text and device data —
17 names, nothing else can be invoked:

```
search_food  log_meal  get_meals  delete_meal  edit_meal
get_steps  get_heart  get_workouts  get_activity_trends
get_vitals  get_body  get_sleep  get_recovery  get_journal
get_goal_guidance  get_plan  update_plan
```

### 3.2 The tool-result side

Tool results are not a separate channel — they are appended to the model's message list as
`role: "tool"` with a JSON string body:

```ts
internalMessages.push({ role: "tool", content: result.toolResult });
```

The two message-list providers rewrite that role to `user` before sending (llama.rn and
BYOK), so the model sees `USER: {"tool":"get_sleep", ...}`. The Apple Foundation Model and
Gemini Nano providers instead flatten every message into text, so a tool result appears as
a `TOOL:\n{…}` block. Every result object carries `tool` and either its payload or
`{"tool":"x","error":"…"}`.

---

## 4. The agent loop (`createChatSession`)

`src/services/localLLM.ts` → `createChatSession({ systemPrompt, toolHandlers })` returns
`{ sendMessage, resetChat, getHistory, cancelGeneration }`.

### 4.1 State

| State | Contents |
|---|---|
| `history: ChatTurn[]` | **display-shaped** turns only — `{ role: "user" \| "assistant", content }`. Assistant entries are **JSON strings** (`{"action":"reply","message":…}`), not plain text. Tool results are *not* persisted here. |
| `abortRef` | set to a closure that flips a local `aborted` flag; `cancelGeneration()` invokes and clears it |

### 4.2 One `sendMessage(text)` call

1. Push the user turn onto `history`.
2. **Lazy re-init:** if no provider is active (e.g. the user just enabled AI or switched
   to BYOK), `initializeLLM()` runs; if it still fails → throw `"LLM not initialized"`.
3. Build `internalMessages` fresh from scratch:
   `[{role:"system",content:systemPrompt}, ...history]`.
   → **the full transcript is re-sent every turn; there is no trimming, windowing, or
   summarisation anywhere in the harness.**
4. Loop up to **`MAX_TURNS = 18`** times:
   1. If aborted → stream `"Generation stopped."`, push it as a reply turn, return.
   2. `response = await provider.chat(internalMessages)`.
   3. `hasTools = response.toolCalls?.length > 0`; `replyText = extractReplyText(response.content)`.
   4. **Text alongside tools** is surfaced immediately as a reply turn (so the user is not
      left staring at a silent "Thinking" bubble while tools run).
   5. If **no tools** → finalise: `finalText = replyText.trim() || FALLBACK_REPLY`, stream
      it, push the reply turn, return.
   6. If tools → for each call:
      - unknown name → push `{ role:"tool", content: '{"tool":"x","error":"Unknown tool"}' }`
        and continue;
      - otherwise `await handler(tool.args)`;
      - if the result carries **`earlyExit`** → push it as the assistant turn, stream its
        `message` (best-effort `JSON.parse`), and **return immediately** — this is the
        approval flow (see §6.2);
      - otherwise push `{ role:"tool", content: result.toolResult }`.
5. **Turn cap exhausted** → fixed message
   `"I've processed everything I can. Let me know if you need anything else!"`, pushed and
   streamed, then return.

`FALLBACK_REPLY` (shared by both chats) is
`"I couldn't find a clear answer for that. Try asking in a different way, or check that your data is synced."`

### 4.3 Reply extraction (`extractReplyText`)

Guards against raw protocol JSON reaching the UI:

1. Try `JSON.parse`. `action === "reply"` → `message`. Else `message`/`text`/`response`.
2. Otherwise strip code fences and re-parse; if the parsed object has no user-facing text,
   return the neutral `"Let me check that for you…"` instead of the payload.
3. `looksLikeBackendPayload()` catches anything starting with `{`, `[` or a fence that
   mentions `"action":` or `"toolCall"` → `"Let me check that for you…"`.

### 4.4 Display extraction (`extractMessages`)

Turns `ChatTurn[]` into `DisplayMessage[]` for the bubbles:

| Stored assistant content | Rendered |
|---|---|
| `{"action":"reply","message":…}` | assistant bubble, plus `pendingApproval` and `mealList` if present |
| `{"action":"search",…}` / `{"action":"log",…}` | small action pill: `Searching for "x"...` / `Logging Chicken (200g)...` |
| any other object | `parsed.message`/`text`, else a pill with `"Let me check that for you…"` — never the raw JSON |
| unparseable text | shown as-is |

`pushIfNew()` drops an assistant bubble whose text is byte-identical to the previous
non-action bubble (models often repeat their lead-in after a tool round-trip). Bubbles
carrying `pendingApproval` or `mealList` are never deduped.

### 4.5 "Streaming"

`streamText(text, onToken, isAborted)` is a **typewriter simulation**: 3 characters every
18 ms via `setTimeout`. The provider has already returned the complete reply. There is no
token-level streaming from the model. (The chat screens render this as a bubble with a `▌`
cursor; a `ThinkingBubble` shows when `loading && !streamingText`.)

### 4.6 What the screens layer on top

Both screens (`app/health-chat.tsx`, `app/food-chat.tsx`) share this pattern:

- `initState: "init" | "downloading" | "ready" | "error"`, with a download overlay driven
  by a 500 ms progress poll, and an **"AI is off"** error variant whose primary button
  routes to `/onboarding/ai-choice?from=chat`.
- `useFocusEffect` re-runs `initializeLLM()` when `getStatus().status === "unavailable"`,
  and rebuilds the session if it was never created.
- **Optimistic user bubbles**: `handleSend` appends the user message to `messages`
  immediately; if a generation is in flight the text goes to `pendingQueue` and an effect
  drains it when `loading` flips false.
- `handleStop` → `cancelGeneration()`; `handleReset` → `resetChat()` + clear bubbles.
- Errors during send append
  `"Sorry, something went wrong. Check your AI provider in Settings and try again."`

Screens differ only in their prompt, tool registry, welcome copy, and the food screen's
extra manual **search fallback view** (`?mode=search`, debounced 300 ms `searchFood`, quick
add via `estimateServing`, link to `/food-detail?fdcId=…`).

---

## 5. System prompts

These are the entire behavioural specification the model gets. Both are sent verbatim as
the `system` message.

### 5.1 Health chat (`HEALTH_SYSTEM_PROMPT`, `app/health-chat.tsx`)

```
You are a health coach AI. You have access to the user's health data through tools. ALWAYS call the right tool before answering — never make up numbers.

Available tools (one per response, JSON format):

ACTIVITY:
  get_steps     — {"action":"get_steps", "period":"today"|"week"|"month"}  → steps, distance, active calories
  get_heart     — {"action":"get_heart", "period":"today"|"week"}             → heart rate, resting HR, HRV
  get_workouts  — {"action":"get_workouts", "period":"week"|"month"}          → recent workout sessions
  get_activity_trends — {"action":"get_activity_trends", "period":"week"|"month"} → daily activity over time

BODY & VITALS:
  get_vitals    — {"action":"get_vitals"}                  → blood oxygen, respiratory rate, body temp, blood pressure
  get_body      — {"action":"get_body"}                    → weight, body fat, lean mass, VO2 max, height

RECOVERY:
  get_sleep     — {"action":"get_sleep", "period":"today"|"week"}  → sleep hours, sleep score
  get_recovery  — {"action":"get_recovery"}                          → strain score, sleep score, readiness score, 7-day readiness trend

LIFESTYLE:
  get_journal   — {"action":"get_journal", "date":"today"|"yesterday"|"YYYY-MM-DD"}  → habits completed, caffeine, hydrationCups, alcohol, mood
  get_meals     — {"action":"get_meals", "date":"today"|"yesterday"|"YYYY-MM-DD"}     → meals with nutrition breakdown

COACH PLANNING:
  get_goal_guidance — {"action":"get_goal_guidance", "goalId":"weight_loss"|"muscle_gain"|... , "topic":"targets"|"nutrition"|...} → knowledge chunk from the goal library
  get_plan          — {"action":"get_plan"}                                              → the user's current saved plan
  update_plan       — {"action":"update_plan","habitIds":[...],"nutrition":{"calories":..,"proteinG":..,"carbsG":..,"fatG":..},"sleepHours":..,"stepsPerDay":..,"trainingDays":..,"focusNote":"..."} → saves a new/updated plan and applies habits to the journal

  When the user asks to make, change, or personalise a plan: call get_goal_guidance (at least the "targets" chunk) for their goal(s), then update_plan with concrete numbers, then reply. Habit ids must be real ids from the goal guidance's habits list. Only change what the user asked to change.

reply — {"action":"reply", "message":"<your reply>"}

RULES:
- NEVER guess data. If the user asks about sleep, call get_sleep first. Steps? get_steps. Recovery? get_recovery.
- Pick the most specific tool. Don't call get_recovery if the user only asked about steps.
- Call ONE tool at a time. The result comes back, then you can call another or reply.
- For questions about trends or history, use period "week" or "month".
- For today's data use period "today" (or omit period).
- Connect dots between sleep, activity, nutrition, and vitals in your reply.
- Be warm, encouraging, concise (2-4 sentences). Mention actual numbers.
- If data is missing, acknowledge it and suggest how to get it.
```

### 5.2 Food chat (`FOOD_SYSTEM_PROMPT`, `app/food-chat.tsx`)

```
You are a nutrition assistant for a mobile app. Help users log food they ate.

You have these tools, one action per response:

1. search_food: {"action": "search", "query": "food name"}
   - Returns up to 8 matches with nutrition per 100g
   - Search one food at a time (e.g. search "eggs", then search "avocado")

2. log_meal: {"action": "log", "fdcId": string, "foodName": string, "servingG": number}
   - Log a food with the exact serving in grams
   - Instead of servingG you can use "calorieTarget": number to specify desired calories
   - Example: {"action": "log", "fdcId": "fd_example", "foodName": "Oatmeal, cooked", "calorieTarget": 180}

3. get_meals: {"action": "get_meals"}
   - Returns all meals logged today with their IDs, names, and nutrition
   - Use this when the user asks what they ate or wants to review their log

4. delete_meal: {"action": "delete_meal", "mealId": "xxx", "foodName": "Chicken breast"}
   - Proposes deleting a meal from today's log (requires user approval)
   - You MUST call get_meals first to find the correct mealId

5. edit_meal: {"action": "edit_meal", "mealId": "xxx", "foodName": "Chicken breast", "newServingG": 200}
   - Proposes changing a meal's serving size (requires user approval)
   - You MUST call get_meals first to find the correct mealId

6. reply — respond to the user. Output {"action": "reply", "message": "<your reply text>"}
   - Optional: add "mealList" to show a structured meal summary
   - Example: {"action": "reply", "message": "You ate 3 items today:", "mealList": [{"foodName": "Scrambled eggs", "servingGrams": 100, "calories": 155, "protein": 13, "carbs": 1, "fat": 11}]}

RULES:
- NEVER make up nutrition data. Only use data returned by search_food.
- For multi-food meals (e.g. "chicken burrito bowl with rice and guac"), search every ingredient, then log each one with its fdcId.
- You may output MULTIPLE actions in one response — one complete JSON object per line. Use this to search or log several foods at once.
- If a response contains multiple actions, do NOT add a reply action — after the tools run you will get a fresh turn to reply with a summary.
- If search returns no matches or unclear matches, ask the user.
- Serving size estimates: 1 egg ≈ 50g, 1 banana ≈ 120g, 1 apple ≈ 180g, 1 slice bread ≈ 30g
- For "X calories of Y": search Y, get calories per 100g, then servingG = (X / caloriesPer100g) × 100
- When user asks to delete/edit, ALWAYS call get_meals first.
- When you are done and need no more tools, ALWAYS end with a reply action: a brief plain-text summary of what you logged (optionally with mealList to show the items).
- Never reply with raw JSON or tool syntax — the user only ever sees reply messages.
- Keep replies brief and friendly.
```

Note the **inconsistency**: the health prompt says *"Call ONE tool at a time"* while the
food prompt explicitly *encourages* multiple actions per response. The parser supports
multi-block for both.

---

## 6. Tool catalogue — what the model can actually do

### 6.1 Health tools (`buildHealthToolHandlers`, `app/health-chat.tsx`)

All of them start with `await HealthService.initialize(false)` (passive — never prompts)
and, unless noted, with `HealthService.getTodayData()`.

| Tool | Args (coerced by `resolvePeriod` / `resolveDate`) | Data read | Returned fields |
|---|---|---|---|
| `get_steps` | `period`: `today` \| `yesterday` \| `week` \| `month` \| number | `getTodayData()` when 1 day, else `getDailyActivity(days)` | `steps`, `distanceMeters`, `activeCalories` — or `totalSteps`, `avgSteps`, `days`, `daily[]` (last 7) |
| `get_heart` | `period` | `getTodayData()`; for multi-day also `getMetricHistory("restingHeartRate"/"heartRateVariability", days)` | `heartRate{avg,max,min,readings}`, `restingHeartRate`, `heartRateVariability`, optional `rhrHistory`/`hrvHistory` (last 7) |
| `get_workouts` | `period` (default `week`) | `getWorkouts(days)` | `count`, `totalMinutes`, `workouts[]` (max 10: name, type, durationMin, calories, date) |
| `get_activity_trends` | `period` (default `week`) | `getDailyActivity(days)` | `totalSteps`, `totalActiveCalories`, `avgSteps`, **`daily[]` for the whole period (up to 30 entries)** |
| `get_vitals` | — | `getTodayData()` | `bloodOxygen` (rounded), `respiratoryRate`, `bodyTemperature`, `bloodPressure` |
| `get_body` | — | `getTodayData()` | `weightKg`, `heightCm`, `bodyFatPercent`, `leanBodyMassKg`, `vo2Max` |
| `get_sleep` | `period` | `getTodayData()` (+ `getReadinessHistory` for multi-day) | `sleepHours` (1 dp), `sleepScore`, `hasSleepStages`, and `sleepStages{deepHours,remHours,awakeMinutes}` **only when stages exist**; for multi-day adds a `note` that historical sleep is limited |
| `get_recovery` | — | `getTodayData()` → `computeStrainScore`, `computeSleepScore`, `calculateReadiness()`, `getReadinessHistory(7)` | `strainScore`, `sleepScore`, `readinessScore`, `readinessSummary`, `hrvDeviation`, `rhrDeviation`, `recentReadiness[]` |
| `get_journal` | `date` | `getHabitLog(dateKey)` | `habitsCompleted[]`, `habitsTotal`, `caffeine`, `hydrationCups`, `alcohol`, `mood`, `hasData` |
| `get_meals` | `date` | `getMeals(dateKey)` | `count`, `totalCalories`, `totalProtein/Carbs/Fat`, `meals[]`, `nutritionSource` (attribution string) |
| `get_goal_guidance` | `goalId`, `topic` | `goalLibrary` (see §7.5) | `guidance` text (≤ 2200 chars), `habits`, `sleepHours`, `stepsPerDay` |
| `get_plan` | — | AsyncStorage `coach_plan_v1` | saved plan subset (`goalIds`, `habitIds`, `nutrition`, `sleepHours`, `stepsPerDay`, `trainingDays`, `focusNote`) or `null` |
| `update_plan` | plan fields | writes the plan + journal habits | `success`, `habitCount`, sanitised `nutrition`/`sleepHours`/`stepsPerDay`/`trainingDays` |

Coercions in the screen file:

```ts
resolvePeriod(raw) → today={1,"today",0} · yesterday={1,"yesterday",-1} · week={7,"last 7 days"} ·
                    month={30,"last 30 days"} · numeric n → {n, `last ${n} days`} · default today
resolveDate(raw)   → today | yesterday | /^\d{4}-\d{2}-\d{2}$/ · default today
```

Every activity/body/recovery/lifestyle handler wraps its body in `try/catch` and answers
`{"tool":"<name>","error":"Could not access …"}` instead of throwing — so a data failure
becomes a sentence the model can explain rather than a crashed turn. The coach-plan tools
(`get_goal_guidance`, `get_plan`, `update_plan`) come from `coachPlan.ts` and rely on its
sanitisers/validation instead of a blanket catch.

### 6.2 Food tools (`buildFoodToolHandlers`, `app/food-chat.tsx`)

| Tool | Behaviour |
|---|---|
| `search_food` | `searchFood(query)` → `found` + up to 8 results with per-100 g macros (`fdcId, description, calories, protein, carbs, fat, fiber`) |
| `log_meal` | Resolves the food (`getFoodByFdcId(fdcId)` → `searchFood(foodName)` first hit → `searchFood(fdcId)`), computes `servingG` (explicit → `calorieTarget / calories × 100` → `estimateServing(description)`), scales macros by `servingG/100`, and **writes the meal immediately** via `logMeal()` |
| `get_meals` | Today's meals with `mealId` per row |
| `delete_meal` | **No write.** Returns `earlyExit` with `pendingApproval: {type:"delete", mealId, foodName, date}` |
| `edit_meal` | **No write.** Returns `earlyExit` with `pendingApproval: {type:"edit", mealId, foodName, date, newServingG}` |

The approval flow is worth stating precisely: the tool handler *ends the turn* with a
`pendingApproval` payload, `extractMessages` renders it as an approve/cancel card
(`ChatBubble`'s approval variant), and only the screen's `handleApprove` touches the
database (`dbDeleteMeal` / `dbUpdateMeal`). **Logging has no approval step** — the model
writing a meal writes it.

---

## 7. Retrieval backends in detail

### 7.1 Food database — bundled SQLite + FTS5 (`src/services/foodDatabase.ts`)

- The database is a **bundled asset**: `src/data/opennutrition-2025.1.db` (OpenNutrition),
  imported into expo-sqlite's native directory on first use
  (`SQLite.importDatabaseFromAssetAsync`, `forceOverwrite` **false** so it copies once per
  install).
- Self-healing: if the `barcodes` table is missing or empty (stale install from an older
  app version), the asset is **re-imported with `forceOverwrite: true`**. The food DB
  holds no user data, so replacing it is safe.
- `searchFood(query)`:
  1. `normalizeQuery` — lowercase, strip everything but `[a-z0-9 ]`, collapse spaces.
  2. `escapeFtsQuery` — each token becomes `"token"*`, joined with ` AND` (prefix match).
  3. ```sql
     SELECT f.id, f.name, f.category, f.calories, f.protein, f.carbs, f.fat, f.fiber
     FROM foods_fts AS search JOIN foods AS f ON f.id = search.id
     WHERE foods_fts MATCH ?
     ORDER BY bm25(foods_fts), f.name
     LIMIT 8
     ```
     → **BM25-ranked full-text search, top 8.** This is the only "retrieval ranking" in
     the food path.
  4. If FTS5 is unavailable on the platform build, falls back to `name LIKE '%…%'`
     (`ORDER BY name LIMIT 8`).
- `getFoodByFdcId(id)` — exact row lookup by `foods.id`.
- `searchFoodByBarcode(ean)` — `barcodes` join, with UPC-A(12) → EAN-13(leading zero) and
  leading-zero-strip variants plus `REPLACE(ean_13,'X','')`. Used by the scanner screen,
  not by the chat tools.
- Meal log lives in AsyncStorage under `meal_log_<YYYY-MM-DD>` as a JSON array of
  `MealEntry` (`id, date, timestamp, fdcId, foodName, servingGrams, calories, protein,
  carbs, fat, fiber`). `logMeal`/`getMeals`/`deleteMeal`/`updateMeal` all read-modify-write
  that array. `updateMeal` merges the partial object it is given.
- `getFoodDatabaseAttribution()` returns the ODbL/DbCL attribution string surfaced in UI
  and included in `get_meals` tool results.
- `estimateServing(description)` is a large ordered if-chain of typical portion sizes
  (≈120 branches) used when the model gives no serving and no calorie target;
  `getServingUnits(description)` suggests unit options for the manual UI.

### 7.2 Health data — HealthKit / Health Connect (`src/services/health.ts`)

`getModules()` picks the platform module: iOS → `react-native-health` (HealthKit),
Android → `react-native-health-connect`. All calls are wrapped so a missing/failed native
module returns `null`/`[]` rather than throwing:

- `hkGet` / `hkGetOne` — promisify `hk[method](options, cb)`, tolerate `results.data`,
  single-object, and `{value}` shapes.
- `hcRead` — `hc.readRecords(type, {timeRangeFilter, ascendingOrder, dataOriginFilter})`.
- `hcAggregate` / `hcAggregateByDay` — Health Connect aggregate APIs. **Cumulative types
  (steps, calories, distance) must be aggregated, not summed from raw records**, otherwise
  multiple writing apps double-count; the code comments say this explicitly.
- `MAX_HEALTH_HISTORY_DAYS = 30` clamps every history request.

**Permissions.** `HEALTHKIT_READ_PERMISSIONS` is 18 read types (StepCount, HeartRate,
RestingHeartRate, HeartRateVariability, RespiratoryRate, SleepAnalysis, ActiveEnergyBurned,
DistanceWalkingRunning, Weight, Height, BloodPressureSystolic, BloodPressureDiastolic,
OxygenSaturation, BodyTemperature, Vo2Max, BodyFatPercentage, LeanBodyMass, Workout).
Health Connect splits into a **core** set (Steps, HeartRate, SleepSession,
ActiveCaloriesBurned, Distance) requested in one batch and 12 **optional** types requested
**one at a time**, so one unsupported metric can't abort the connection.

**Authorisation semantics.** `_doInitialize(true)` is the only path that prompts (iOS:
`initHealthKit` *is* the prompt; Android: `getSdkStatus` check → `initialize` →
`requestPermission` → re-read `getGrantedPermissions`). `initialize(false)` is passive and
never prompts. `hasReadPermissions()` on iOS relies on a local flag
(`healthkit_access_requested`, set by `markHealthKitSetupRequested()`) because **Apple does
not report read authorisation**; on Android it reads the granted-permission list.

**`getTodayData()`** dispatches to `fetchHealthKitData()` (a `Promise.all` over 16
`hkGet` calls) or `fetchHealthConnectData()` (aggregates + reads, with the origin filter
below). It returns a flat `HealthData`: `steps, heartRate[], sleepHours, activeCalories,
distance, weight, height, bloodPressure{systolic,diastolic}, bloodOxygen,
bodyTemperature, respiratoryRate, restingHeartRate, heartRateVariability, hrvEstimated?,
vo2Max, bodyFat, leanBodyMass, sleepAwakeHours, sleepDeepHours, sleepRemHours,
sleepHasStages`.

Notable implementation details inside the fetchers:

- **HRV may be a proxy**: when the wearable writes no HRV records, an RMSSD-style estimate
  is derived from heart-rate samples and flagged `hrvEstimated: true`.
- **SpO₂ normalisation**: HealthKit values are often `0–1` fractions and are scaled to `%`.
- **Sleep staging**: HealthKit counts `ASLEEP*` segments; Health Connect stage values are
  corrected so `sleepHours` means actual sleep, with `sleepHasStages` telling the caller
  whether deep/REM/awake numbers are real or absent.
- **Android source filter** (`resolveDataSourceFilter`): steps/calories/distance totals can
  be restricted to the wearable chosen during onboarding by matching Health Connect
  `dataOrigin` package names against brand keywords. `SOURCE_ORIGIN_DETECTION_DAYS = 14`;
  the result is cached **only when a match is found** (so the filter engages once the watch
  starts writing). All-sources totals are also read so the app can tell the difference.

History helpers used by tools:

| Function | Notes |
|---|---|
| `getDailyActivity(days)` | Seeds every day in the range (so gaps are explicit), fills steps/calories via per-day aggregates, then adds **workout counts and active minutes** from `getWorkouts(days)`. Each row carries `hasData`/`hasSteps` to distinguish a measured zero from a missing sample. |
| `getSleepHistory(days)` | Builds intervals, **splits sessions at midnight**, **merges overlaps**, and returns one merged daily total per date as `{date, value}`. |
| `getMetricHistory(metric, days)` | `restingHeartRate` \| `heartRateVariability` \| `weight` \| `bodyFat` → `{date, value}[]`. |
| `getWorkouts(days)` | HealthKit `getAnchoredWorkouts` with a `getSamples` fallback; Health Connect `ExerciseSession` with `EXERCISE_TYPE_META` mapping type codes → name/category/icon. |

### 7.3 Journal and plan (`src/services/journal.ts`, `coachPlan.ts`)

- `getHabitLog(dateKey)` reads the day's `HabitLog`:
  `{ formatVersion, date, completed: Record<string, boolean>, counters: Record<string, number>,
  hydration, caffeine, alcohol, weight, mood, note }`.
- `HABIT_LIBRARY` is the canonical habit catalogue; each entry is `binary`, `counter` (with
  `target`) or `measure` (with `unit`, `step`, `decimals`). Habit ids coming from the model
  are validated against it (`validateHabitIds`, max 14 unique).
- The coach plan is one AsyncStorage blob, `coach_plan_v1`, version 1:
  `{ version, createdAt, updatedAt, goalIds, goalLabels, habitIds, nutrition, sleepHours,
  stepsPerDay, trainingDays, activityLevel, focusNote, generatedBy: "ai" | "draft" }`.
- `update_plan` (AI path) is deliberately **merge-only**:

  | Field | Sanitiser | Range / default |
  |---|---|---|
  | `nutrition.calories` | `sanitizeNutrition` | 1200–6000, required (null → keep existing) |
  | `proteinG` | `clamp` | 40–400, default `25% of calories / 4` |
  | `carbsG` | `clamp` | 0–900, default `40% of calories / 4` |
  | `fatG` | `clamp` | 20–300, default `30% of calories / 9` |
  | `sleepHours` | `sanitizeSleepHours` | 5–12 |
  | `stepsPerDay` | `sanitizeStepsPerDay` | 1000–30000 |
  | `trainingDays` | `sanitizeTrainingDays` | 0–7 |

  Anything the model omits inherits the existing plan value (`?? existing?.…`), so partial
  edits don't wipe the rest of the plan. After saving, `applyPlanHabits()` pushes
  `habitIds` into the journal's active habits.
- **The AI never *creates* the first plan.** Onboarding uses `buildDraftPlan()` — a
  deterministic evidence-informed builder (Mifflin-St Jeor BMR with a reference weight,
  activity multipliers, goal-mode combination rules like cut+bulk → recomposition, protein
  g/kg maxima, carb share by training goal, fat remainder clamped to the 25–35% AMDR band,
  habits ranked by goal overlap plus universal foundations `water_goal`/`early_bed`/
  `device_bed`, injury-recovery step cap, templated focus notes). `createPlan()` returns
  `usedAi: false`. The AI only *adjusts* an existing plan through `update_plan`.

### 7.4 Readiness (`src/services/readiness.ts`, `insights.ts`)

`calculateReadiness(hrv, rhr, sleepHours)` — called by `get_recovery` and by
`recordTodayReadiness()`:

- Baseline is a local rolling store (`readiness_baseline`) of daily snapshots; the last
  21 values per metric are compared against today's.
- Score starts at 50, then HRV ratio contributes `clamp(±25, (hrv/avg − 1) × 50)`, RHR
  contributes the inverse, sleep adds `+15` (≥7 h) / `+5` (≥5 h) / `−10` (below), clamped to
  0–100.
- With no baseline, fixed offsets apply (`hrv != null` → `+10`, `rhr != null` → `−5`).
- The summary string is chosen **deterministically** from five phrasings per band
  (high/moderate/low) via `summaryFor(score)`, so identical scores read identically.
- **Pure read.** `calculateReadiness()` no longer writes anything. Recording happens in
  `recordTodayReadiness()` (the sole write path), which computes the score against the
  *prior* baseline and only then persists today's snapshot (`recordDailySnapshot`) and score
  (`recordReadiness`). It is called once per day from the Biology tab.
- `getReadinessHistory(7)` (from `insights.ts`) reads `readiness_history` (dates + scores),
  written by `recordReadiness` inside `recordTodayReadiness`.

### 7.5 Goal library — the only real RAG (`src/services/goalLibrary.ts`)

The knowledge base is `GOAL_DOCS`: each goal is a document with `id`, `label`, `emoji`,
`tagline`, `summary`, `habits`, `sleepHours`, `stepsPerDay`, and **`sections`** — small
chunks with `{id, title, content, keywords}` (e.g. section id `targets`). The comment on
the module states the design intent: *"the LLM only ever sees the sections it asks for
(basic RAG), instead of being handed the whole library at once."*

Retrieval is **keyword scoring, not embeddings**:

```ts
tokenize(text)      // lowercase, strip non-alphanumeric, drop stop words, len > 1
searchGoalChunks(query, maxResults = 4):
  for each goal, for each section:
    score = 3 × (#query tokens in section.keywords ∪ title tokens)
          + 1 × (#query tokens in goal id/label/tagline tokens)
          + 1 if section.id === "targets" and query mentions goal|target|calorie|protein|sleep|steps
    hit = { goalId, sectionId, title, snippet: content.slice(0,160)+"…", score }
  sort by score desc, take maxResults
getGoalChunkText(goalId, sectionIds, maxChars)   // concatenates "## {label} — {title}\n{content}"
                                                 // until the char cap (tool passes 2200)
```

The tool exposes three paths:

1. **Exact** `goalId` + `topic` that is a real section id → full chunk text (≤2200 chars).
2. **Unknown `goalId`** → `searchGoalChunks()` across the library, returning
   `{matches[], hint: "Call again with a goalId from the matches and a sectionId to expand."}`
   (two-step retrieval — the model narrows, then expands).
3. **Known goal, loose `topic`** (e.g. `"protein intake"`) → `searchGoalChunks(topic)`
   filtered to that goal; if nothing matches, falls back to the `targets` chunk.

---

## 8. Context, budgets, and truncation

| Knob | Value | Where |
|---|---|---|
| Agent loop turns per user message | **18** (`MAX_TURNS`) | `localLLM.ts` |
| Local model context | **4096 tokens** (`n_ctx`) | `llamaProvider.ts` |
| Local generation cap | **800 tokens** (`n_predict`) | `llamaProvider.ts` |
| Cloud generation cap | **1024 tokens** (`MAX_TOKENS`) | `byok.ts` |
| Temperature | `0.3` on OpenAI/OpenRouter + Gemini; **Anthropic omits it** | providers |
| top_p | `0.9` | llama.rn only |
| History trimming | **none** | `localLLM.ts` |
| Food search results | 8 (`LIMIT 8`) | `foodDatabase.ts` |
| Workouts listed | 10 (`.slice(0, 10)`) | `health-chat.tsx` |
| Steps/HR history rows | last 7 (`.slice(-7)`) | `health-chat.tsx` |
| Activity trend rows | **up to 30 (not truncated)** | `health-chat.tsx` |
| Goal guidance text | 2200 chars | `coachPlan.ts` |
| Goal snippets | 160 chars | `goalLibrary.ts` |
| Health history depth | 30 days (`MAX_HEALTH_HISTORY_DAYS`) | `health.ts` |
| Input length | 500 chars (`maxLength`) | both chat screens |

**Inferred risk:** because the full transcript is re-sent every turn and nothing is
trimmed, a long conversation with the 4096-token local models will silently overflow the
context. There is no summarisation, no sliding window, and no token counting anywhere in
the harness.

---

## 9. Privacy and data flow

| Path | What leaves the device |
|---|---|
| `"local"` (llama / Apple / Nano) | nothing — prompt and data stay on device |
| `"byok"` | the entire message list: system prompt, full transcript, and **every tool result** (health numbers, meals, journal entries) |
| `"none"` | nothing; AI features are off |

`scrubForCloud(text)` (`src/services/cloudPrivacy.ts`) is applied to **every message** on
the BYOK path only. It is pattern-based, best-effort redaction:

| Pattern | Replacement |
|---|---|
| email addresses | `[email removed]` |
| `http(s)://` / `www.` URLs | `[link removed]` |
| phone-like digit runs | `[phone removed]` |
| IPv4 | `[network address removed]` |
| UUID-ish hex | `[identifier removed]` |
| SSN / "social security number" | `[government id removed]` |
| "my name is …" / "full name …" | `[name removed]` |
| "my address is …" / "street address …" | `[address removed]` |

The module's own doc comment is explicit that this is **not a guarantee of anonymity**, and
the AI setup screen repeats that warning to the user. Note what is *not* scrubbed: the
health values themselves (that is the point of the feature), free-text journal notes, and
any identifier the user types in a phrasing the regexes don't cover.

The BYOK key is stored only in the device keystore (`byok_config_v1`), is sent only to the
chosen provider, and is never transmitted to Myrri's own servers (there are none in this
path).

---

## 10. Failure modes (what the user sees)

| Situation | Behaviour |
|---|---|
| AI choice is `"none"` | "AI is off" overlay with **Enable AI** → `/onboarding/ai-choice?from=chat`; the food screen also offers **Search foods instead** |
| Init throws | "Setup Failed" overlay + **Retry** (`initializeLLM()` again) |
| Model download in progress | overlay with % from the 500 ms progress poll |
| BYOK with no/invalid key | init throws the "isn't set up yet" message → Setup Failed; `testByokConnection` on the settings screen gives the provider's own error text (truncated to 300 chars) |
| Provider returns unparseable text | `parseProviderResponse` → `{content: raw}` → shown as-is (unless it looks like a payload, then the neutral "Let me check that for you…") |
| Model emits an empty reply | `FALLBACK_REPLY` |
| Model requests an unknown tool | `{"tool":"x","error":"Unknown tool"}` fed back; the model usually recovers |
| Tool throws | Handler's catch returns `{"error":"Could not access …"}` |
| Model loops without replying | after 18 turns, the "I've processed everything I can." message |
| Send while generating | text queued in `pendingQueue`, drained when `loading` flips false |
| User taps stop | `cancelGeneration()` → `"Generation stopped."` |
| Fetch/network hangs (BYOK) | **no timeout or retry** — the "Thinking" bubble stays until the OS-level fetch fails |

---

## 11. Where the harness is weak (why it feels bad)

Ordered roughly by impact per unit of effort. All of these are code-level observations from
the files above; none require speculation.

1. **No real streaming.** `streamText` is a typewriter animation over a complete response.
   Perceived latency = full completion time, and the user can't start reading early. The
   providers' APIs all support streaming, and `llama.rn` exposes a token callback
   (`completion(..., {onToken})`) — none of it is wired up.
2. **The local default models are very small.** Qwen 2.5 0.5B / Llama 3.2 1B at Q4. The
   whole protocol depends on the model reliably emitting well-formed JSON with correct tool
   names and argument names, and on following an 18-turn plan. That is a lot to ask of a
   0.5B model, especially in a ~2.5 KB system prompt. The AI-choice screen itself labels
   local as **"NOT RECOMMENDED"**.
3. **No context management.** Full transcript every turn, no trimming (see §8). Local
   models silently lose the beginning of the conversation at 4096 tokens; cloud calls get
   more expensive and slower as the chat grows. There is no "compact the history" step.
4. **`log_meal` writes without approval, and can log the wrong food.** `delete`/`edit` have
   approval cards, but logging is immediate. Worse, when the model supplies a bad/missing
   `fdcId`, the handler silently falls back to `searchFood(foodName)` and logs **the top
   hit** — the model never sees a "which one did you mean?" branch unless search returns
   nothing. Multi-ingredient meals can therefore be partly wrong with no rollback: there is
   no transaction around a multi-log turn.
5. **`edit_meal` does not recompute macros.** `handleApprove` calls
   `dbUpdateMeal(date, mealId, { servingGrams })`, and `updateMeal` merges that partial
   object — so calories/protein/carbs/fat keep their old values and the day's totals stay
   stale. The manual path (`logFood` in the chat screen and the food screens) recomputes
   macros from per-100 g values, so the two paths disagree. This is a real correctness bug,
   not just a UX gap. **Fixed:** `handleApprove` now calls `rescaleMeal()`, which re-derives
   the macros from the catalog row (or proportionally) as part of the same write.
6. **Health tool results drop provenance.** `hrvEstimated` never reaches the model, so an
   RMSSD proxy is presented as a measured HRV. Nor do tool results carry sample counts or
   timestamps for most metrics, so "your resting HR is 52" can come from a week-old sample
   with no way for the model to say so.
7. **`get_sleep` can't answer historical sleep questions.** For multi-day periods it
   returns only today's numbers plus a `note` telling the model that historical sleep is
   limited — even though `HealthService.getSleepHistory(days)` exists and is used elsewhere
   (morning brief, biology tab). The doc/prompt advertise `period: "week"` for sleep.
   **Fixed:** `get_sleep` now returns `nights[]` + `averageHours` from
   `HealthService.getSleepHistory()` for multi-day periods (and the previous night for
   `"yesterday"`).
8. **Repeated expensive reads.** Every health tool call does
   `HealthService.initialize(false)` and then `getTodayData()`, which issues 16 native
   queries in one `Promise.all`. A 5-turn tool conversation pays that cost 5 times, and
   nothing is cached per `sendMessage`. **Fixed:** the snapshot-aware tools share a
   memoised `getTodaySnapshot()` in `health-chat.tsx`, reset at the start of each
   `sendMessage`, so a turn replays 16 queries once instead of once per tool (a rejected
   fetch is never cached, so a later tool in the same turn can retry).
9. **Prompt inconsistency.** Health says "Call ONE tool at a time"; food says the opposite.
   The model receives contradictory guidance about the same protocol.
10. **Apple/Gemini Nano bypass the protocol hardening.** They parse a single JSON object
    and do not check `ALLOWED_TOOL_NAMES`, unlike `parseProviderResponse`. Handlers still
    validate, but the allowlist is not a single choke point across all providers.
11. **No argument schema validation.** Apart from the plan sanitisers and the `log_meal`
    defaults, args flow into handlers raw. e.g. `search_food` with `query: null` becomes
    `""` → empty result → the model improvises; `newServingG` strings/NaN are handled only
    by `if (!mealId || newServingG <= 0)`.
12. **Randomised readiness phrasing** makes identical data produce different wording
    between calls, which reads as inconsistency when the user asks twice. **Fixed:** the
    summary is now deterministic (`summaryFor(score)`).
13. **`calculateReadiness` writes state as a side effect** of being called from a tool, so
    a chat turn can mutate the readiness baseline. **Fixed:** `calculateReadiness()` is now
    pure; `recordTodayReadiness()` is the explicit, per-day write path (from the Biology
    tab). This also gave `readiness_history` its first real writer, so the `recentReadiness`
    trend and `calculateHabitImpacts()` finally see data.
14. **The assistant's own history is stored as raw JSON.** On later turns the model sees its
    previous replies as `{"action":"reply","message":"…"}` blobs. It works (it reinforces the
    format), but it wastes tokens and can bias the model toward emitting JSON
    unnecessarily. Tool results are not persisted at all, so the model cannot re-read
    earlier data without calling the tool again.
15. **No timeouts/retries/backoff** on BYOK fetches, and no cancellation of an in-flight
    HTTP request when the user taps stop (`abortRef` only stops the loop between turns,
    not the request).
16. **`"yesterday"` is silently ignored by every activity tool.** `resolvePeriod()` computes
    `dateOffset: -1` for `"yesterday"`, but the activity/recovery handlers destructure only
    `{ days, label }` — the offset is never read. So `{"action":"get_steps","period":"yesterday"}`
    answers with **today's** numbers (it takes the `days === 1` branch into
    `getTodayData()`). Only the two date-aware tools (`get_journal`, `get_meals`) honour a
    date at all. This is a truthfulness bug, not just a gap: the model will report the
    wrong day with full confidence and cite real numbers while doing it. **Partially fixed:**
    `get_steps` now honours the offset (reads that day's row from `getDailyActivity`); the
    other snapshot tools still ignore it.

### Highest-leverage improvements (if you want them next)

| Change | Why |
|---|---|
| Use native function calling for BYOK (`tools`/`tool_choice` for OpenAI/Anthropic/Gemini) and keep the JSON protocol only for local | Removes the single biggest quality risk — JSON formatting — for the providers that are actually recommended |
| Wire real streaming (provider streams; `llama.rn` `onToken`) | Biggest perceived-latency win; the UI already has a streaming bubble |
| Trim/summarise history + cap tool results (e.g. roll older turns into a summary block) | Fixes silent context overflow on local models |
| Approval or undo for `log_meal`, and recompute macros in `edit_meal` | Correctness; matches the UX already used for delete/edit |
| ~~Cache one `getTodayData()` snapshot per `sendMessage`~~ (done — `getTodaySnapshot()` in `health-chat.tsx`) / add a compact "health snapshot" tool | Cuts native calls from O(turns) to O(1) |
| Add `hrvEstimated`, sample counts, and latest-sample dates to every tool result | Stops confidently-wrong health answers |
| Unit-test `extractJsonBlocks` / `parseProviderResponse` / `extractReplyText` | Pure functions, cheap to test, and the protocol is the most failure-prone part of the app |

---

## 12. Debugging playbook

**Isolate the harness from the model.** Set the provider to BYOK with OpenAI
(`gpt-4o-mini`) — the strongest JSON follower available — and re-run the failing prompt. If
it works there and not on Llama, it's a model-capability problem, not a harness bug.

**Watch the console for these tags:**

| Tag | Emitted by |
|---|---|
| `[LLM] Init failed:` | `initializeLLM` |
| `[HealthChat] Init failed:` / `[FoodChat] Init failed:` | chat screens |
| `[HealthChat] Send failed:` / `[FoodChat] Send failed:` | chat screens' `sendMessage` |
| `[FoodChat] Search failed:` / `Log failed:` / `Approve failed:` | food screen |
| `[FoodDB] FTS search unavailable, using indexed-name fallback` | `searchFood` |
| `[FoodDB] Barcode database ready (… barcodes)` / `Barcodes missing or empty` | `getDatabase` |
| `[HealthService] …` | every health read/permission path (`initialize failed`, `getDailyActivity failed`, `Failed to read <record>`, `Data source detection failed`, …) |
| `[MorningBrief] …` | brief scheduling |

**See the raw model output.** `parseProviderResponse` is called at the end of
`llamaProvider.chat()` and `byokProvider.chat()`; the Apple and Gemini Nano providers do
their own inline `JSON.parse` instead. Log the raw string immediately before it (in `llamaProvider.chat`,
`byokProvider.chat`, or the Apple/Nano providers) to see exactly what the model emitted —
this is the fastest way to tell "model wrote garbage" from "parser dropped something".

**Probe the protocol without the app.** Because it's plain JSON over a chat completion, you
can reproduce it with curl: send the system prompt from §5 plus one user message, and
inspect the raw completion for a well-formed action. No tooling or fixtures needed.

**Inspect stored state.**

| Key | Store | Contents |
|---|---|---|
| `llm_provider_choice` | AsyncStorage | `byok` \| `local` \| `none` |
| `llama_selected_model` | AsyncStorage | active GGUF id |
| `byok_config_v1` | SecureStore | provider, key, model, baseUrl |
| `coach_plan_v1` | AsyncStorage | the coach plan |
| `meal_log_<date>` | AsyncStorage | meal entries for a day |
| `readiness_baseline`, `readiness_history` | AsyncStorage | readiness snapshots / scores |
| `healthkit_access_requested`, `health_setup_skipped` | AsyncStorage | iOS HealthKit bookkeeping |
| `${documentDirectory}models/*.gguf` | filesystem | downloaded local models (deleting forces a re-download) |

**Reproduce a tool path in isolation.** Every handler is a plain async function of
`args` returning `{toolResult, earlyExit?}`. `buildHealthToolHandlers()` /
`buildFoodToolHandlers()` can be called and invoked directly (e.g. from a scratch screen or
a node-side harness with stubs) without any model involved — that's the right way to test
retrieval changes.

---

## 13. How to add a new tool

1. **Implement the handler** in the relevant registry (`buildHealthToolHandlers` in
   `app/health-chat.tsx`, `buildFoodToolHandlers` in `app/food-chat.tsx`), returning
   `{ toolResult: JSON.stringify({ tool: "<name>", ... }) }`. Include `tool` in the payload
   and prefer returning an `error` string over throwing.
2. **Add the name to `ALLOWED_TOOL_NAMES`** in
   `src/services/providers/parseToolResponse.ts` — otherwise the call is dropped silently
   (this is the most common mistake).
3. **Document it in the system prompt** with the exact JSON shape, an example, and a rule
   for when to use it. The prompt is the only discovery mechanism the model has.
4. **Add an alias** in `parseProviderResponse`'s `actionMap` if you want a short form
   (e.g. `steps` → `get_steps`).
5. **Bound the payload.** Tool results are re-sent on every subsequent turn; slice arrays
   and cap text (see §8 for existing limits).
6. If the tool changes device state (write/delete), prefer the **`earlyExit` +
   `pendingApproval`** pattern already used by `delete_meal` / `edit_meal`, or make the
   write idempotent and cheap to undo.

---

## 14. Quick reference

**Storage & constants**

```
Chat sessions:      createChatSession({ systemPrompt, toolHandlers })   src/services/localLLM.ts
Turn cap:           MAX_TURNS = 18
Fallback reply:     FALLBACK_REPLY
Cloud token cap:    MAX_TOKENS = 1024                                   src/services/providers/byok.ts
Local context:      n_ctx 4096, n_predict 800, temp 0.3, top_p 0.9       src/services/providers/llamaProvider.ts
Model download:     50 MB minimum file size to count as downloaded
Health history:     MAX_HEALTH_HISTORY_DAYS = 30                        src/services/health.ts
Origin detection:   SOURCE_ORIGIN_DETECTION_DAYS = 14
Food search:        LIMIT 8, ORDER BY bm25(foods_fts)                   src/services/foodDatabase.ts
Goal RAG:           +3 section keyword hit, +1 goal token, +1 targets boost, 160-char snippets
                    getGoalChunkText default 1800 chars (tool passes 2200) src/services/goalLibrary.ts
Approval flow:      earlyExit → pendingApproval → ChatBubble card → handleApprove
```

**Only two files create sessions** — `app/health-chat.tsx` and `app/food-chat.tsx` — and
both use the same harness with a different system prompt and tool registry. The coach plan
in onboarding is generated deterministically (`buildDraftPlan`), **not** by the AI.
