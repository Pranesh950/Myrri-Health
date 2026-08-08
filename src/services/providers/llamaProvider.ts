import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LLMProvider, ChatMessage, LLMResponse } from "./types";
import { parseProviderResponse } from "./parseToolResponse";

export interface LlamaModel {
  id: string;
  name: string;
  size: string;
  url: string;
  filename: string;
}

export const AVAILABLE_MODELS: LlamaModel[] = [
  {
    id: "qwen-0.5b",
    name: "Qwen 2.5 0.5B",
    size: "~400 MB",
    url: "https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf",
    filename: "qwen2.5-0.5b-q4_k_m.gguf",
  },
  {
    id: "llama-1b",
    name: "Llama 3.2 1B",
    size: "~700 MB",
    url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    filename: "llama-3.2-1b-q4_k_m.gguf",
  },
];

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;
const SELECTED_MODEL_KEY = "llama_selected_model";

let context: any = null;
let currentModelId: string | null = null;

// Per-model download progress (0–1 or -1 for not started)
const downloadProgressMap: Record<string, number> = {};

export function getDownloadProgress(modelId?: string): number {
  const id = modelId ?? currentModelId ?? AVAILABLE_MODELS[0].id;
  return downloadProgressMap[id] ?? 0;
}

export function getCurrentModelId(): string | null {
  return currentModelId;
}

export function getAvailableModels(): LlamaModel[] {
  return AVAILABLE_MODELS;
}

export async function getSelectedModelId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SELECTED_MODEL_KEY);
    if (stored && AVAILABLE_MODELS.some((m) => m.id === stored)) {
      return stored;
    }
  } catch {}
  return AVAILABLE_MODELS[0].id;
}

export async function setSelectedModelId(id: string): Promise<void> {
  await AsyncStorage.setItem(SELECTED_MODEL_KEY, id);
}

function getModelById(id: string): LlamaModel {
  return AVAILABLE_MODELS.find((m) => m.id === id) ?? AVAILABLE_MODELS[0];
}

export async function isModelDownloaded(modelId: string): Promise<boolean> {
  const model = getModelById(modelId);
  const path = `${MODEL_DIR}${model.filename}`;
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists && (info.size ?? 0) > 50_000_000;
  } catch {
    return false;
  }
}

async function ensureModelDownloaded(modelId: string): Promise<string> {
  const model = getModelById(modelId);
  const path = `${MODEL_DIR}${model.filename}`;

  if (await isModelDownloaded(modelId)) {
    downloadProgressMap[modelId] = 1;
    return path;
  }

  await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

  downloadProgressMap[modelId] = 0;

  const download = FileSystem.createDownloadResumable(
    model.url,
    path,
    {},
    (progress) => {
      downloadProgressMap[modelId] =
        progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
    }
  );

  const result = await download.downloadAsync();
  if (!result || !result.uri) {
    downloadProgressMap[modelId] = -1;
    throw new Error(`Failed to download ${model.name}`);
  }
  downloadProgressMap[modelId] = 1;
  return result.uri;
}

async function disposeContext(): Promise<void> {
  if (context) {
    try {
      await context.cancel();
    } catch {}
    context = null;
  }
  currentModelId = null;
}

export const llamaProvider: LLMProvider = {
  name: "Llama (local)",

  async isAvailable(): Promise<boolean> {
    try {
      const llama = require("llama.rn");
      return llama != null;
    } catch {
      return false;
    }
  },

  async init(): Promise<void> {
    const modelId = await getSelectedModelId();
    await this.switchModel(modelId);
  },

  async switchModel(modelId: string): Promise<void> {
    if (currentModelId === modelId && context) return;

    await disposeContext();

    const modelPath = await ensureModelDownloaded(modelId);
    const llama = require("llama.rn");

    context = await llama.initLlama({
      model: modelPath,
      n_ctx: 4096,
      use_mlock: true,
      n_gpu_layers: Platform.OS === "ios" ? 99 : 0,
    });

    currentModelId = modelId;
    await setSelectedModelId(modelId);
  },

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    if (!context) {
      await this.init();
    }

    const result = await context.completion({
      messages: messages.map((m) => ({
        role: m.role === "tool" ? "user" : m.role,
        content: m.content,
      })),
      n_predict: 800,
      temperature: 0.3,
      top_p: 0.9,
      stop: ["<|im_end|>", "<|endoftext|>", "<|eot_id|>"],
    });

    const raw = (result.content || result.text || "").trim();
    return parseProviderResponse(raw);
  },

  async dispose(): Promise<void> {
    await disposeContext();
  },
};
