// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import * as SecureStore from "expo-secure-store";
import { ChatMessage, LLMProvider, LLMResponse } from "./types";
import { scrubForCloud } from "../cloudPrivacy";
import { parseProviderResponse } from "./parseToolResponse";

export type ByokProviderId = "openai" | "anthropic" | "gemini" | "openrouter";

export interface ByokConfig {
  provider: ByokProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const CONFIG_KEY = "byok_config_v1";
const MAX_TOKENS = 1024;

export const BYOK_DEFAULTS: Record<
  ByokProviderId,
  { label: string; model: string; baseUrl: string; endpoint: string; modelHint: string }
> = {
  openai: {
    label: "OpenAI",
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    endpoint: "/chat/completions",
    modelHint: "e.g. gpt-4o-mini, gpt-4o",
  },
  anthropic: {
    label: "Anthropic",
    model: "claude-3-5-haiku-latest",
    baseUrl: "https://api.anthropic.com/v1",
    endpoint: "/messages",
    modelHint: "e.g. claude-3-5-haiku-latest, claude-sonnet-4",
  },
  gemini: {
    label: "Google Gemini",
    model: "gemini-2.0-flash",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    endpoint: "",
    modelHint: "e.g. gemini-2.0-flash, gemini-2.5-flash",
  },
  openrouter: {
    label: "OpenRouter",
    model: "openai/gpt-4o-mini",
    baseUrl: "https://openrouter.ai/api/v1",
    endpoint: "/chat/completions",
    modelHint: "e.g. openai/gpt-4o-mini, anthropic/claude-3.5-haiku",
  },
};

export const BYOK_PROVIDER_IDS: ByokProviderId[] = ["openai", "anthropic", "gemini", "openrouter"];

// The whole config (including the API key) lives in the device's secure
// keystore/keychain — never in plaintext AsyncStorage. The value is small,
// well under SecureStore's ~2 KB per-item limit.

export async function getByokConfig(): Promise<ByokConfig | null> {
  try {
    const raw = await SecureStore.getItemAsync(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ByokConfig>;
    if (!parsed.apiKey || !BYOK_DEFAULTS[parsed.provider as ByokProviderId]) return null;
    return {
      provider: parsed.provider as ByokProviderId,
      apiKey: parsed.apiKey,
      model: parsed.model || BYOK_DEFAULTS[parsed.provider as ByokProviderId].model,
      baseUrl: parsed.baseUrl || undefined,
    };
  } catch {
    return null;
  }
}

export async function saveByokConfig(config: ByokConfig): Promise<void> {
  await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(config), {
    // iOS: keep the item encrypted and THIS-DEVICE-ONLY so the key never
    // migrates to another device via Keychain backup/restore, and only
    // readable while the device is unlocked (which is exactly when the app
    // uses it). Ignored on Android — the Keystore already enforces
    // device-only encryption there.
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearByokConfig(): Promise<void> {
  await SecureStore.deleteItemAsync(CONFIG_KEY);
}

// ── Request builders ──────────────────────────────────────────

interface ParsedBody {
  text: string;
  data: any;
}

async function readJsonResponse(res: Response): Promise<ParsedBody> {
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    // Non-JSON error body — use raw text below.
  }
  if (!res.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      (typeof data?.error === "string" ? data.error : null) ||
      text ||
      `HTTP ${res.status}`;
    throw new Error(String(message).slice(0, 300));
  }
  return { text: text.trim(), data };
}

function scrubMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    role: message.role === "tool" ? "user" : message.role,
    content: scrubForCloud(message.content),
  }));
}

/** Providers need alternating user/assistant turns — merge consecutive ones.
 * Tool results are rewritten as "user" messages, so consecutive same-role
 * turns are common after a tool call. `field` is "content" for string turns
 * (OpenAI/Anthropic) or "parts" for Gemini's array-based content. */
function mergeConsecutive<T extends { role: string }>(messages: T[], field: "content" | "parts"): T[] {
  const merged: T[] = [];
  for (const message of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === message.role) {
      if (field === "parts") {
        (last as any).parts.push(...(message as any).parts);
      } else {
        (last as any).content += `\n\n${(message as any).content}`;
      }
    } else {
      merged.push(message);
    }
  }
  return merged;
}

async function openAiCompatibleChat(
  config: ByokConfig,
  messages: ChatMessage[],
  headers: Record<string, string> = {}
): Promise<string> {
  const defaults = BYOK_DEFAULTS[config.provider];
  const base = (config.baseUrl || defaults.baseUrl).replace(/\/$/, "");
  const endpoint = config.provider === "gemini" ? "" : defaults.endpoint;

  const url = `${base}${endpoint}${
    config.provider === "gemini"
      ? `/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`
      : ""
  }`;

  let body: unknown;
  if (config.provider === "gemini") {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const contents = mergeConsecutive(
      messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      "parts"
    );
    body = {
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig: { temperature: 0.3, maxOutputTokens: MAX_TOKENS },
    };
  } else if (config.provider === "anthropic") {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const turns = mergeConsecutive(
      messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, content: m.content })),
      "content"
    );
    body = {
      model: config.model,
      max_tokens: MAX_TOKENS,
      system: system || undefined,
      messages: turns,
    };
  } else {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const turns = mergeConsecutive(
      messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, content: m.content })),
      "content"
    );
    body = {
      model: config.model,
      messages: [...(system ? [{ role: "system", content: system }] : []), ...turns],
      temperature: 0.3,
      max_tokens: MAX_TOKENS,
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const { data } = await readJsonResponse(res);

  if (config.provider === "gemini") {
    return (
      data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join("") ?? ""
    );
  }
  if (config.provider === "anthropic") {
    return data?.content?.[0]?.text ?? "";
  }
  return data?.choices?.[0]?.message?.content ?? "";
}

async function chatFor(config: ByokConfig, messages: ChatMessage[]): Promise<string> {
  return openAiCompatibleChat(config, messages);
}

// ── Provider ──────────────────────────────────────────────────

export const byokProvider: LLMProvider = {
  name: "BYOK",

  async isAvailable(): Promise<boolean> {
    return (await getByokConfig()) != null;
  },

  async init(): Promise<void> {},

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    const config = await getByokConfig();
    if (!config) {
      throw new Error("Bring-your-own-key isn't set up yet. Add your API key in settings.");
    }
    const raw = await chatFor(config, scrubMessages(messages));
    return parseProviderResponse(raw);
  },

  async dispose(): Promise<void> {},
};

/** Verifies a key + model with a tiny request. Never stores anything. */
export async function testByokConnection(
  config: ByokConfig
): Promise<{ ok: boolean; message: string }> {
  try {
    const raw = await chatFor(config, [
      { role: "user", content: "Reply with exactly: ok" },
    ]);
    const reply = (raw || "").trim().slice(0, 80);
    return { ok: true, message: `Connected! ${config.model} replied: "${reply}"` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Connection failed." };
  }
}
