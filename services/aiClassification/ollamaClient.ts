import { aiClassificationJsonSchema, parseAiClassificationResult, type AiClassificationResult } from "./schemas";
import { aiClassificationSystemPrompt } from "./prompts";

export class OllamaUnavailableError extends Error {
  constructor(message = "Ollamaが起動していないためAI分類をスキップ") {
    super(message);
    this.name = "OllamaUnavailableError";
  }
}

export function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434").replace(/\/+$/, "");
}

export function getOllamaModel() {
  return process.env.OLLAMA_MODEL?.trim() || "qwen3:8b";
}

export async function isOllamaAvailable() {
  try {
    const response = await fetch(`${getOllamaBaseUrl()}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function requestOllamaClassification(userPrompt: string): Promise<AiClassificationResult> {
  const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getOllamaModel(),
      stream: false,
      messages: [
        {
          role: "system",
          content: `${aiClassificationSystemPrompt}\n\n必ず次のJSON Schemaに一致するJSONだけを返してください。\n${JSON.stringify(aiClassificationJsonSchema)}`
        },
        { role: "user", content: userPrompt }
      ],
      format: aiClassificationJsonSchema,
      options: { temperature: 0 }
    }),
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    throw new Error(`Ollama API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const content = readOllamaContent(payload);
  if (!content) return fallbackResult("Ollamaの応答本文を取得できなかったため要確認");

  try {
    return parseAiClassificationResult(JSON.parse(content));
  } catch {
    const extracted = extractJsonObject(content);
    if (!extracted) return fallbackResult("OllamaのJSON解析に失敗したため要確認");
    try {
      return parseAiClassificationResult(JSON.parse(extracted));
    } catch {
      return fallbackResult("OllamaのJSONがスキーマに一致しないため要確認");
    }
  }
}

function readOllamaContent(payload: Record<string, unknown>) {
  const message = payload.message;
  if (!message || typeof message !== "object") return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === "string" ? content : null;
}

function extractJsonObject(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return value.slice(start, end + 1);
}

function fallbackResult(reason: string): AiClassificationResult {
  return {
    isLotteryApplicationPage: false,
    isCurrentlyOpen: null,
    isPastOrEnded: false,
    isJustArticle: false,
    isProductSalesPage: false,
    isPriceBuybackPage: false,
    category: "other",
    confidenceScore: 0.2,
    applicationStartAt: null,
    applicationEndAt: null,
    resultAnnouncementAt: null,
    purchaseDeadlineAt: null,
    reason,
    excludeReason: reason
  };
}
