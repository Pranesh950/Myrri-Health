import { Platform } from "react-native";
import { LLMProvider, ChatMessage, LLMResponse } from "./types";

async function callGeminiNano(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  try {
    const mod = require("../../../modules/gemini-nano");
    return await mod.generate(prompt, systemPrompt);
  } catch {
    throw new Error("Gemini Nano unavailable");
  }
}

export const geminiNanoProvider: LLMProvider = {
  name: "Gemini Nano",

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    try {
      const mod = require("../../../modules/gemini-nano");
      return await mod.isAvailable();
    } catch {
      return false;
    }
  },

  async init(): Promise<void> {},

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    const systemPrompt = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
    const userPrompt = messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
      .join("\n\n") + "\n\nASSISTANT:\n";

    const result = await callGeminiNano(userPrompt, systemPrompt);

    try {
      const parsed = JSON.parse(result);
      const action = parsed.action || parsed.action_type || "";

      const actionMap: Record<string, string> = {
        search: "search_food",
        search_food: "search_food",
        log: "log_meal",
        log_meal: "log_meal",
      };

      if (action && action !== "reply") {
        const toolName = actionMap[action] || action;
        const { action: _, action_type: __, message, text, response, ...args } = parsed;
        return { content: "", toolCalls: [{ name: toolName, args }] };
      }

      return { content: parsed.message || parsed.text || result };
    } catch {
      return { content: result };
    }
  },

  async dispose(): Promise<void> {},
};
