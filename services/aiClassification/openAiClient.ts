import { aiClassificationJsonSchema, parseAiClassificationResult, type AiClassificationResult } from "./schemas";
import { aiClassificationSystemPrompt } from "./prompts";

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function hasOpenAiApiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export class OpenAiApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null
  ) {
    super(message);
    this.name = "OpenAiApiError";
  }
}

export async function requestOpenAiClassification(userPrompt: string): Promise<AiClassificationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY が未設定です。");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      input: [
        { role: "system", content: aiClassificationSystemPrompt },
        { role: "user", content: userPrompt }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "lottery_page_classification",
          strict: true,
          schema: aiClassificationJsonSchema
        }
      }
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new OpenAiApiError(`OpenAI API ${response.status}: ${detail.slice(0, 300)}`, response.status, extractErrorCode(detail));
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const text = extractResponseText(payload);
  if (!text) throw new Error("OpenAI API の応答本文を取得できませんでした。");
  return parseAiClassificationResult(JSON.parse(text));
}

export function isTerminalOpenAiApiError(error: unknown) {
  return error instanceof OpenAiApiError && (error.status === 401 || error.status === 403 || error.status === 429);
}

function extractResponseText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("");
}

function extractErrorCode(detail: string) {
  try {
    const parsed = JSON.parse(detail) as { error?: { code?: unknown } };
    return typeof parsed.error?.code === "string" ? parsed.error.code : null;
  } catch {
    return null;
  }
}
