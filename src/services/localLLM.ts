// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChatMessage, LLMProvider, LLMResponse } from "./providers/types";
import { appleBuiltinProvider } from "./providers/appleBuiltin";
import { geminiNanoProvider } from "./providers/geminiNano";
import { byokProvider, getByokConfig, BYOK_DEFAULTS } from "./providers/byok";
import {
  llamaProvider,
  getDownloadProgress,
  getCurrentModelId,
  getAvailableModels,
  isModelDownloaded,
  type LlamaModel,
} from "./providers/llamaProvider";

// ── Shared provider state ──────────────────────────────────────

type ProviderStatus = "unavailable" | "downloading" | "ready" | "error";

interface ProviderInfo {
  name: string;
  status: ProviderStatus;
  downloadProgress: number;
}

export type LLMChoice = "local" | "byok" | "none";

export const LLM_CHOICE_KEY = "llm_provider_choice";

let activeProvider: {
  info: ProviderInfo;
  provider: LLMProvider;
} | null = null;

let initPromise: Promise<void> | null = null;
let providerGeneration = 0;

export function getStatus(): ProviderInfo {
  if (activeProvider) return activeProvider.info;
  return { name: "None", status: "unavailable", downloadProgress: 0 };
}

export function getActiveProviderName(): string {
  return activeProvider?.info.name ?? "None";
}

export async function getLLMChoice(): Promise<LLMChoice> {
  try {
    const stored = await AsyncStorage.getItem(LLM_CHOICE_KEY);
    if (stored === "local") return "local";
    if (stored === "byok") return "byok";
    if (stored === "none") return "none";
    // The old "puter" option was removed. Puter users have no API key set up,
    // so migrate them to "none" rather than "byok": a BYOK choice with no key
    // would fail every init and leave chat stuck on "Setup Failed", while
    // "none" shows the "AI is off" state whose Enable AI button routes back
    // into the choice screen to pick BYOK or local.
    if (stored === "puter") {
      await AsyncStorage.setItem(LLM_CHOICE_KEY, "none");
      return "none";
    }
    return "byok";
  } catch {
    return "byok";
  }
}

/** True when the user opted into an AI assistant (not "No AI"). */
export async function isAIEnabled(): Promise<boolean> {
  try {
    return (await getLLMChoice()) !== "none";
  } catch {
    return true;
  }
}

export async function setLLMChoice(choice: LLMChoice): Promise<void> {
  await AsyncStorage.setItem(LLM_CHOICE_KEY, choice);
  // If the app is already running, ensure the next chat uses the new choice.
  await resetLLM();
}

async function selectProvider(): Promise<LLMProvider> {
  const choice = await getLLMChoice();
  if (choice === "none") {
    throw new Error("AI is turned off — enable it in the AI setup screen to chat.");
  }
  if (choice === "byok") {
    if (await byokProvider.isAvailable()) return byokProvider;
    throw new Error("Bring-your-own-key isn't set up yet. Add your API key or choose another AI option.");
  }
  if (await appleBuiltinProvider.isAvailable()) return appleBuiltinProvider;
  if (await geminiNanoProvider.isAvailable()) return geminiNanoProvider;
  if (await llamaProvider.isAvailable()) return llamaProvider;
  throw new Error("No local AI provider is available on this device. Bring your own key or use a compatible phone.");
}

export async function initializeLLM(): Promise<void> {
  if (initPromise) return initPromise;

  const generation = providerGeneration;
  const promise = (async () => {
    const provider = await selectProvider();
    const isLlama = provider.name === llamaProvider.name;

    // A provider choice changed while selection was in flight. Do not let the
    // stale provider become active or send anything on the old path.
    if (generation !== providerGeneration) {
      await provider.dispose().catch(() => {});
      return;
    }

    const info: ProviderInfo = {
      name: provider.name,
      status: isLlama ? "downloading" : "ready",
      downloadProgress: isLlama ? getDownloadProgress() : 0,
    };
    activeProvider = { provider, info };

    try {
      await provider.init();
      if (generation !== providerGeneration || activeProvider?.provider !== provider) {
        await provider.dispose().catch(() => {});
        return;
      }
      info.status = "ready";
      info.downloadProgress = 1;
      if (provider === llamaProvider) {
        const modelId = getCurrentModelId();
        const model = modelId ? getAvailableModels().find((m) => m.id === modelId) : null;
        info.name = model ? `Llama (${model.name})` : "Llama";
      }
      if (provider === byokProvider) {
        const config = await getByokConfig();
        info.name = config ? `BYOK · ${BYOK_DEFAULTS[config.provider].label}` : "BYOK";
      }
    } catch (e) {
      if (generation === providerGeneration && activeProvider?.provider === provider) {
        info.status = "error";
      }
      console.warn("[LLM] Init failed:", e);
      throw e;
    }
  })();

  initPromise = promise;
  // Allow the Retry button to make a fresh attempt after a failed startup.
  promise.catch(() => {
    if (initPromise === promise) initPromise = null;
  });
  return promise;
}

export async function resetLLM(): Promise<void> {
  providerGeneration += 1;
  const current = activeProvider;
  activeProvider = null;
  initPromise = null;
  if (current) {
    try {
      await current.provider.dispose();
    } catch {}
  }
}

export function getQwenDownloadProgress(): number {
  return getDownloadProgress();
}

export function getLlamaModelId(): string | null {
  return getCurrentModelId();
}

export function getAvailableLlamaModels(): LlamaModel[] {
  return getAvailableModels();
}

export async function switchLlamaModel(modelId: string): Promise<void> {
  const prev = getCurrentModelId();
  if (prev === modelId) return;
  if (activeProvider?.provider === llamaProvider) {
    await activeProvider.provider.switchModel?.(modelId);
    const model = getAvailableModels().find((m) => m.id === modelId);
    activeProvider.info.name = model ? `Llama (${model.name})` : "Llama";
    activeProvider.info.status = "ready";
  }
}

export async function checkModelDownloaded(modelId: string): Promise<boolean> {
  return isModelDownloaded(modelId);
}

// ── Chat Session ───────────────────────────────────────────────

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** A tool handler receives tool args and returns its result. */
export interface ToolResult {
  /** JSON string pushed to the LLM's internal message list. */
  toolResult: string;
  /** If set, a JSON string pushed to messageHistory and the loop returns immediately (approval flow). */
  earlyExit?: string;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

export interface ChatSessionConfig {
  systemPrompt: string;
  toolHandlers: Record<string, ToolHandler>;
}

export interface ChatSession {
  sendMessage(text: string, onToken?: (partial: string) => void): Promise<ChatTurn[]>;
  resetChat(): Promise<void>;
  getHistory(): ChatTurn[];
  cancelGeneration(): void;
}

// Shown when the model's reply came back empty — small local models often
// emit a blank action (e.g. after a tool call). Guarantees the user always
// sees a response instead of a silent turn. Wording is intentionally generic:
// this loop is shared by the health chat and the food chat.
const FALLBACK_REPLY =
  "I couldn't find a clear answer for that. Try asking in a different way, or check that your data is synced.";

export function createChatSession(config: ChatSessionConfig): ChatSession {
  const { systemPrompt, toolHandlers } = config;
  const history: ChatTurn[] = [];
  let abortRef: (() => void) | null = null;

  async function sendMessage(text: string, onToken?: (partial: string) => void): Promise<ChatTurn[]> {
    history.push({ role: "user", content: text });

    // Lazy re-init: if the provider was reset (e.g. the user switched to BYOK
    // from a chat screen), pick up the new choice on the next message.
    if (!activeProvider) {
      await initializeLLM().catch(() => {});
      if (!activeProvider) throw new Error("LLM not initialized");
    }

    let aborted = false;
    abortRef = () => { aborted = true; };

    const internalMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    // Headroom for complex flows like multi-item meal logging (search each
    // ingredient, then log each one).
    const MAX_TURNS = 18;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (aborted) {
        abortRef = null;
        const msg = "Generation stopped.";
        if (onToken) await streamText(msg, onToken, () => aborted);
        history.push({
          role: "assistant",
          content: JSON.stringify({ action: "reply", message: msg }),
        });
        return history;
      }

      const response = await activeProvider.provider.chat(internalMessages);
      const hasTools = !!response.toolCalls && response.toolCalls.length > 0;
      const replyText = extractReplyText(response.content);

      // Some models write visible text AND request a tool in the same reply.
      // Surface that text now instead of discarding it, so the user is never
      // left staring at a silent "Thinking" bubble while tools run.
      if (hasTools && replyText.trim()) {
        history.push({
          role: "assistant",
          content: JSON.stringify({ action: "reply", message: replyText }),
        });
      }

      if (!hasTools) {
        // Never end a turn with an invisible (empty) assistant message.
        const finalText = replyText.trim() ? replyText.trim() : FALLBACK_REPLY;
        abortRef = null;
        const replyJson = JSON.stringify({ action: "reply", message: finalText });
        if (onToken && finalText) await streamText(finalText, onToken, () => aborted);
        history.push({ role: "assistant", content: replyJson });
        return history;
      }

      for (const tool of response.toolCalls) {
        const handler = toolHandlers[tool.name];
        if (!handler) {
          internalMessages.push({
            role: "tool",
            content: JSON.stringify({ tool: tool.name, error: "Unknown tool" }),
          });
          continue;
        }

        const result = await handler(tool.args);

        if (result.earlyExit) {
          abortRef = null;
          if (onToken) {
            try {
              const parsed = JSON.parse(result.earlyExit);
              const msg = parsed.message || "";
              if (msg) await streamText(msg, onToken, () => aborted);
            } catch {}
          }
          history.push({ role: "assistant", content: result.earlyExit });
          return history;
        }

        internalMessages.push({ role: "tool", content: result.toolResult });
      }
    }

    abortRef = null;
    const fallbackMsg = "I've processed everything I can. Let me know if you need anything else!";
    if (onToken) await streamText(fallbackMsg, onToken, () => aborted);
    history.push({
      role: "assistant",
      content: JSON.stringify({
        action: "reply",
        message: fallbackMsg,
      }),
    });
    return history;
  }

  return {
    sendMessage,
    resetChat: async () => { history.length = 0; },
    getHistory: () => history,
    cancelGeneration: () => { if (abortRef) { abortRef(); abortRef = null; } },
  };
}

// ── Streaming simulation helper ───────────────────────────────

/** Simulates character-by-character streaming using setTimeout ticks. */
function streamText(
  text: string,
  onToken: (partial: string) => void,
  isAborted: () => boolean
): Promise<void> {
  return new Promise((resolve) => {
    let pos = 0;
    const CHARS_PER_TICK = 3;
    const TICK_MS = 18;

    function tick() {
      if (isAborted()) { resolve(); return; }
      if (pos >= text.length) { resolve(); return; }
      pos = Math.min(pos + CHARS_PER_TICK, text.length);
      onToken(text.slice(0, pos));
      setTimeout(tick, TICK_MS);
    }

    tick();
  });
}

// ── Reply extraction helper ────────────────────────────────────

/** True when text looks like a raw tool-call payload that must never be
 *  shown to the user (e.g. multiple JSON actions the provider couldn't map,
 *  including JSON arrays of actions). */
function looksLikeBackendPayload(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!/^\s*\{/.test(trimmed) && !/^\s*\[/.test(trimmed) && !/^\s*```/.test(trimmed)) return false;
  return /"action"\s*:/.test(trimmed) || /"toolCalls?"\s*:/.test(trimmed) || /\.\.\./.test(trimmed) && trimmed.includes("{");
}

function extractReplyText(raw: string): string {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (parsed?.action === "reply") {
    const m = parsed.message;
    return typeof m === "string" ? m : m ? String(m) : "";
  }
  if (parsed?.message || parsed?.text || parsed?.response) {
    const m = parsed.message || parsed.text || parsed.response;
    return typeof m === "string" ? m : String(m);
  }

  const cleaned = (raw || "").trim();
  if (cleaned.startsWith("```") || cleaned.startsWith("{\"") || cleaned.startsWith("[")) {
    const stripped = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      const reParsed = JSON.parse(stripped);
      const reText = reParsed.message || reParsed.text || reParsed.response;
      if (reText) return typeof reText === "string" ? reText : String(reText);
      // Parsed JSON without a user-facing message (e.g. a lone action object
      // that slipped through) — never surface the raw payload.
      return looksLikeBackendPayload(stripped) ? "Let me check that for you…" : stripped;
    } catch {
      // Unparseable JSON (e.g. several action blocks) — never surface it.
      return looksLikeBackendPayload(cleaned) ? "Let me check that for you…" : cleaned;
    }
  }
  if (looksLikeBackendPayload(cleaned)) return "Let me check that for you…";
  return cleaned;
}

// ── Message extraction (shared utility) ────────────────────────

export interface DisplayMessage {
  sender: "user" | "assistant";
  text: string;
  isAction?: boolean;
  pendingApproval?: { type: string; mealId: string; foodName: string; date: string; newServingG?: number };
  mealList?: { foodName: string; servingGrams: number; calories: number; protein: number; carbs: number; fat: number }[];
}

export function extractMessages(turns: ChatTurn[]): DisplayMessage[] {
  const out: DisplayMessage[] = [];

  for (const t of turns) {
    let msg: DisplayMessage;

    if (t.role === "user") {
      msg = { sender: "user" as const, text: t.content };
    } else {
      let parsed: any;
      try {
        parsed = JSON.parse(t.content);
      } catch {
        msg = { sender: "assistant" as const, text: t.content };
      }

      if (parsed.action === "reply") {
        msg = {
          sender: "assistant" as const,
          text: parsed.message || "",
          pendingApproval: parsed.pendingApproval || undefined,
          mealList: parsed.mealList || undefined,
        };
      } else if (parsed.action === "search") {
        msg = { sender: "assistant" as const, text: `Searching for "${parsed.query || "food"}"...`, isAction: true };
      } else if (parsed.action === "log") {
        const g = parsed.servingG || parsed.serving_grams || "";
        msg = { sender: "assistant" as const, text: `Logging ${parsed.foodName || "food"}${g ? ` (${g}g)` : ""}...`, isAction: true };
      } else {
        // Never surface raw tool payloads — hide unknown action JSON behind a
        // neutral pill instead of showing backend internals.
        msg = {
          sender: "assistant" as const,
          text:
            parsed.message ||
            parsed.text ||
            (looksLikeBackendPayload(JSON.stringify(parsed))
              ? "Let me check that for you…"
              : JSON.stringify(parsed)),
          isAction: true,
        };
      }
    }

    pushIfNew(out, msg);
  }

  return out;
}

/** Skips a bubble identical to the previous assistant bubble — models
 *  sometimes repeat their lead-in text as the final answer after a tool
 *  round-trip, which would otherwise show the same message twice. Bubbles
 *  carrying an approval/meal payload are never deduped (their text may match
 *  while the underlying action differs). */
function pushIfNew(out: DisplayMessage[], msg: DisplayMessage): void {
  const prev = out[out.length - 1];
  if (
    prev &&
    prev.sender === "assistant" &&
    msg.sender === "assistant" &&
    !prev.isAction &&
    !msg.isAction &&
    !prev.pendingApproval &&
    !msg.pendingApproval &&
    !prev.mealList &&
    !msg.mealList &&
    msg.text &&
    msg.text === prev.text
  ) {
    return;
  }
  out.push(msg);
}
