import { requireNativeModule } from "expo-modules-core";

let module: any = null;

function getModule() {
  if (!module) {
    try {
      module = requireNativeModule("GeminiNanoModule");
    } catch {
      return null;
    }
  }
  return module;
}

export function isAvailable(): Promise<boolean> {
  const mod = getModule();
  if (!mod) return Promise.resolve(false);
  try {
    return Promise.resolve(mod.isAvailable());
  } catch {
    return Promise.resolve(false);
  }
}

export function generate(prompt: string, systemPrompt?: string): Promise<string> {
  const mod = getModule();
  if (!mod) throw new Error("Gemini Nano module not available");
  return mod.generate(prompt, systemPrompt ?? "");
}
