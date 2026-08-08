// Myrri Health
// Copyright (C) 2026 Pranesh Shivaraj
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
}

export interface LLMProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  init(): Promise<void>;
  chat(messages: ChatMessage[]): Promise<LLMResponse>;
  dispose(): Promise<void>;
  switchModel?(modelId: string): Promise<void>;
}
