type AssistantProvider = "ollama" | "gemini" | "vertex";

/**
 * Default model mapping per assistant provider.
 *
 * Constraint:
 * - Keys must stay aligned with supported provider identifiers.
 */
export const PROVIDER_DEFAULT_MODELS: Record<AssistantProvider, string> = {
  ollama: "qwen3:8b",
  gemini: "gemini-2.5-flash",
  vertex: "gemini-2.5-flash",
};
