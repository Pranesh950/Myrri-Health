// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import { LLMResponse } from "./types";

const ALLOWED_TOOL_NAMES = new Set([
  "search_food",
  "log_meal",
  "get_meals",
  "delete_meal",
  "edit_meal",
  "get_steps",
  "get_heart",
  "get_workouts",
  "get_activity_trends",
  "get_vitals",
  "get_body",
  "get_sleep",
  "get_recovery",
  "get_journal",
  "get_goal_guidance",
  "get_plan",
  "update_plan",
]);

/**
 * Extracts complete JSON objects from a model reply by tracking brace depth,
 * so a response containing several action blocks (common for complex meals,
 * e.g. one search per ingredient) is parsed into separate actions instead of
 * being treated as unparseable text.
 */
export function extractJsonBlocks(raw: string): any[] {
  const blocks: any[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const slice = raw.slice(start, i + 1);
        try {
          blocks.push(JSON.parse(slice));
        } catch {}
        start = -1;
      }
    }
  }
  return blocks;
}

/** Parses a model's raw reply into text and/or safe tool calls. A single
 *  reply may contain several action blocks — every one becomes a tool call. */
export function parseProviderResponse(raw: string): LLMResponse {
  const blocks = extractJsonBlocks(raw).filter(
    (b) => b && typeof b === "object"
  );

  // No structured actions found — the whole reply is plain text.
  if (blocks.length === 0) return { content: raw.trim() };

  const toolCalls: NonNullable<LLMResponse["toolCalls"]> = [];
  let replyText = "";

  for (const parsed of blocks) {
    const action = parsed.action || parsed.action_type || "";
    if (!action || action === "reply") {
      replyText = parsed.message || parsed.text || parsed.response || replyText;
      continue;
    }

    const actionMap: Record<string, string> = {
      search: "search_food",
      log: "log_meal",
    };
    const toolName = actionMap[action] || action;
    if (!ALLOWED_TOOL_NAMES.has(toolName)) continue;

    const { action: _, action_type: __, message, text, response, ...args } = parsed;
    if (toolName === "search_food" && !args.query) args.query = parsed.query || parsed.food || "";
    if (toolName === "log_meal") {
      args.fdcId = String(parsed.fdcId || parsed.food_id || "");
      args.foodName = parsed.foodName || parsed.food_name || parsed.name || "";
      args.servingG = parsed.servingG || parsed.serving_grams || parsed.portion_g || 100;
    }
    toolCalls.push({ name: toolName, args });
  }

  if (toolCalls.length > 0) {
    // Keep any reply text the model wrote alongside its tool call, so the
    // chat loop can surface it instead of leaving the user staring at a
    // silent thinking bubble while the tool runs.
    return { content: replyText, toolCalls };
  }
  // No safe actions — fall back to the best reply text, never raw payloads.
  if (replyText) return { content: replyText };
  return { content: "" };
}
