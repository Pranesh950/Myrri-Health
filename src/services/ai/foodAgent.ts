// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Phase 1 of the AI-harness migration (see AI_CHAT_REBUILD_PLAN.md §3/§5).
 *
 * Replaces the hand-rolled `createChatSession` loop in `src/services/localLLM.ts` with the
 * AI SDK's `ToolLoopAgent`: the SDK drives the call → tool → call → reply loop, streams
 * tokens, and surfaces tool approvals. The legacy 18-turn cap becomes `stepCountIs`.
 *
 * Additive and inert until Phase 2 wires it into the food screen; the model and prompts are
 * passed in by the caller so nothing here duplicates `FOOD_SYSTEM_PROMPT`.
 */

import { ToolLoopAgent, stepCountIs, type LanguageModel } from "ai";
import { foodTools } from "./foodTools";

/** Upper bound on call→tool→reply rounds. Replaces the legacy `MAX_TURNS = 18`. */
export const FOOD_AGENT_MAX_STEPS = 10;

export function createFoodAgent(options: { model: LanguageModel; instructions: string }) {
  return new ToolLoopAgent({
    model: options.model,
    instructions: options.instructions,
    tools: foodTools,
    stopWhen: stepCountIs(FOOD_AGENT_MAX_STEPS),
  });
}
