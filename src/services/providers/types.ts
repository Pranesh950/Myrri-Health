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
