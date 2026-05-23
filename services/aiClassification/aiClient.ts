import { hasOpenAiApiKey, isTerminalOpenAiApiError, requestOpenAiClassification } from "./openAiClient";
import { getOllamaModel, isOllamaAvailable, OllamaUnavailableError, requestOllamaClassification } from "./ollamaClient";
import type { AiClassificationResult } from "./schemas";

export type AiProvider = "openai" | "ollama" | "disabled";

export type AiProviderStatus = {
  provider: AiProvider;
  enabled: boolean;
  skipReason: string | null;
};

export function getAiProvider(): AiProvider {
  const value = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (value === "openai" || value === "ollama" || value === "disabled") return value;
  return hasOpenAiApiKey() ? "openai" : "disabled";
}

export async function getAiProviderStatus(): Promise<AiProviderStatus> {
  const provider = getAiProvider();
  if (provider === "disabled") {
    return { provider, enabled: false, skipReason: "AI_PROVIDER=disabled のためAI分類をスキップ" };
  }
  if (provider === "openai" && !hasOpenAiApiKey()) {
    return { provider, enabled: false, skipReason: "OPENAI_API_KEY 未設定のためAI分類をスキップ" };
  }
  if (provider === "ollama" && !(await isOllamaAvailable())) {
    return { provider, enabled: false, skipReason: "Ollamaが起動していないためAI分類をスキップ" };
  }
  return { provider, enabled: true, skipReason: null };
}

export function getAiModelLabel() {
  const provider = getAiProvider();
  if (provider === "ollama") return `ollama:${getOllamaModel()}`;
  if (provider === "openai") return `openai:${process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"}`;
  return "disabled";
}

export async function requestAiClassification(userPrompt: string): Promise<AiClassificationResult> {
  const provider = getAiProvider();
  if (provider === "disabled") throw new Error("AI_PROVIDER=disabled のためAI分類をスキップ");
  if (provider === "ollama") return requestOllamaClassification(userPrompt);
  return requestOpenAiClassification(userPrompt);
}

export function isTerminalAiProviderError(error: unknown) {
  return isTerminalOpenAiApiError(error) || error instanceof OllamaUnavailableError;
}
