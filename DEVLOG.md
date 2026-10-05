# Devlog

Short notes on what's changed recently.

## Oct 2026

- **Documented the AI chat system.** Wrote `AI_CHAT_HARNESS.md` — how the current
  hand-rolled harness works end to end (providers, JSON tool protocol, agent loop,
  health/food tools, retrieval, failure modes) and its 16 known weaknesses.
- **Planned the replacement.** Wrote `AI_CHAT_REBUILD_PLAN.md` — a proposal to move to
  Vercel AI SDK v6 + Callstack `react-native-ai`, with version pins, a phased plan, and
  the risks to spike first.
- **Brand assets.** Added the Everwave mark/svg and generated the app icons + splash
  through `scripts/generate-logo.mjs`.
- **Chat UI.** Reworked `ChatBubble` and `ThinkingBubble`.
- **Correctness fixes.** `edit_meal` now recomputes macros for the new serving size;
  `get_sleep` answers multi-day and "yesterday" questions from real sleep history;
  `get_steps` honours "yesterday" instead of silently returning today.
- **Readiness cleanup.** `calculateReadiness()` is now a pure read (no more state writes
  from a chat tool call) with a deterministic summary string. Recording moved to the
  explicit `recordTodayReadiness()`, called once per day from the Biology tab — which also
  means `readiness_history` (the 7-day trend shown to the AI and habit impacts) is finally
  populated.
- **One health snapshot per message.** The health-chat tools now share a memoised
  `getTodayData()` result that is cleared at the start of every `sendMessage`, so a
  multi-turn reply no longer re-runs 16 native queries for each tool call.

## Next

- Phase 0 spike for the AI chat rebuild (streaming in RN, on-device tool calling,
  approval round-trip).
- Keep `AI_CHAT_HARNESS.md` as the record of the old design until the new one ships.
