import type { AssistantProvider } from "@/lib/assistant-storage";

export const PROVIDER_DEFAULT_MODELS: Record<AssistantProvider, string> = {
  ollama: "qwen3:8b",
  gemini: "gemini-2.5-flash",
  vertex: "gemini-2.5-flash",
};
