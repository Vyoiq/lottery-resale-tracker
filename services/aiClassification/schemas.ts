export const aiClassificationJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    isLotteryApplicationPage: { type: "boolean" },
    isCurrentlyOpen: { anyOf: [{ type: "boolean" }, { type: "null" }] },
    isPastOrEnded: { type: "boolean" },
    isJustArticle: { type: "boolean" },
    isProductSalesPage: { type: "boolean" },
    isPriceBuybackPage: { type: "boolean" },
    category: {
      type: "string",
      enum: ["pokemon_card", "trading_card", "electronics", "stationery", "other"]
    },
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
    applicationStartAt: { anyOf: [{ type: "string" }, { type: "null" }] },
    applicationEndAt: { anyOf: [{ type: "string" }, { type: "null" }] },
    resultAnnouncementAt: { anyOf: [{ type: "string" }, { type: "null" }] },
    purchaseDeadlineAt: { anyOf: [{ type: "string" }, { type: "null" }] },
    reason: { type: "string" },
    excludeReason: { anyOf: [{ type: "string" }, { type: "null" }] }
  },
  required: [
    "isLotteryApplicationPage",
    "isCurrentlyOpen",
    "isPastOrEnded",
    "isJustArticle",
    "isProductSalesPage",
    "isPriceBuybackPage",
    "category",
    "confidenceScore",
    "applicationStartAt",
    "applicationEndAt",
    "resultAnnouncementAt",
    "purchaseDeadlineAt",
    "reason",
    "excludeReason"
  ]
} as const;

export type AiClassificationResult = {
  isLotteryApplicationPage: boolean;
  isCurrentlyOpen: boolean | null;
  isPastOrEnded: boolean;
  isJustArticle: boolean;
  isProductSalesPage: boolean;
  isPriceBuybackPage: boolean;
  category: "pokemon_card" | "trading_card" | "electronics" | "stationery" | "other";
  confidenceScore: number;
  applicationStartAt: string | null;
  applicationEndAt: string | null;
  resultAnnouncementAt: string | null;
  purchaseDeadlineAt: string | null;
  reason: string;
  excludeReason: string | null;
};

export function parseAiClassificationResult(value: unknown): AiClassificationResult {
  if (!value || typeof value !== "object") throw new Error("AI分類のJSONが不正です。");
  const data = value as Record<string, unknown>;
  const category = data.category;
  const categories = new Set(["pokemon_card", "trading_card", "electronics", "stationery", "other"]);
  if (!categories.has(String(category))) throw new Error("AI分類のカテゴリが不正です。");

  const result: AiClassificationResult = {
    isLotteryApplicationPage: readBoolean(data.isLotteryApplicationPage, "isLotteryApplicationPage"),
    isCurrentlyOpen: readNullableBoolean(data.isCurrentlyOpen, "isCurrentlyOpen"),
    isPastOrEnded: readBoolean(data.isPastOrEnded, "isPastOrEnded"),
    isJustArticle: readBoolean(data.isJustArticle, "isJustArticle"),
    isProductSalesPage: readBoolean(data.isProductSalesPage, "isProductSalesPage"),
    isPriceBuybackPage: readBoolean(data.isPriceBuybackPage, "isPriceBuybackPage"),
    category: category as AiClassificationResult["category"],
    confidenceScore: readScore(data.confidenceScore),
    applicationStartAt: readNullableString(data.applicationStartAt, "applicationStartAt"),
    applicationEndAt: readNullableString(data.applicationEndAt, "applicationEndAt"),
    resultAnnouncementAt: readNullableString(data.resultAnnouncementAt, "resultAnnouncementAt"),
    purchaseDeadlineAt: readNullableString(data.purchaseDeadlineAt, "purchaseDeadlineAt"),
    reason: readString(data.reason, "reason"),
    excludeReason: readNullableString(data.excludeReason, "excludeReason")
  };

  return result;
}

function readBoolean(value: unknown, key: string) {
  if (typeof value !== "boolean") throw new Error(`AI分類の ${key} が不正です。`);
  return value;
}

function readNullableBoolean(value: unknown, key: string) {
  if (value === null || typeof value === "boolean") return value;
  throw new Error(`AI分類の ${key} が不正です。`);
}

function readString(value: unknown, key: string) {
  if (typeof value !== "string") throw new Error(`AI分類の ${key} が不正です。`);
  return value;
}

function readNullableString(value: unknown, key: string) {
  if (value === null || typeof value === "string") return value;
  throw new Error(`AI分類の ${key} が不正です。`);
}

function readScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("AI分類の confidenceScore が不正です。");
  return Math.max(0, Math.min(1, value));
}
