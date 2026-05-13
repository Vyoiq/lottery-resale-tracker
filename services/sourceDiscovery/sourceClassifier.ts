import type { DiscoveryQuery } from "@prisma/client";
import { hostName, normalizeDiscoveredUrl } from "./queryBuilder";

const watchKeywords = [
  "抽選",
  "抽選販売",
  "応募",
  "予約",
  "当選",
  "販売情報",
  "お知らせ",
  "ポケモンカード",
  "ポケカ",
  "box",
  "BOX",
  "スペシャルBOX"
];

const priceKeywords = [
  "買取",
  "買取価格",
  "買取表",
  "買取検索",
  "高価買取",
  "未開封買取",
  "トレカ買取",
  "ポケカ買取"
];

const exclusionKeywords = [
  "example.com",
  "ログイン必須",
  "会員限定",
  "captcha",
  "CAPTCHA",
  "フリマ",
  "メルカリ",
  "ヤフオク",
  "個別出品",
  "広告",
  "中古販売価格",
  "販売価格のみ"
];

export type ClassifiedSourceCandidate = {
  title: string;
  url: string;
  normalizedUrl: string;
  description?: string | null;
  detectedType: "watch_source_candidate" | "price_source_candidate" | "unknown";
  category: string;
  confidenceScore: number;
  matchedKeywords: string[];
  reason: string;
};

export function classifySourceCandidate(input: {
  title: string;
  url: string;
  description?: string | null;
  query: Pick<DiscoveryQuery, "type" | "category">;
}): ClassifiedSourceCandidate | null {
  const normalizedUrl = normalizeDiscoveredUrl(input.url);
  const haystack = `${input.title} ${input.description ?? ""} ${normalizedUrl}`.toLowerCase();

  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) return null;
  if (haystack.includes("example.com")) return null;

  const matchedExclusions = exclusionKeywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
  const matchedWatch = watchKeywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
  const matchedPrice = priceKeywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));

  let score = 0.15;
  score += Math.min(0.35, matchedWatch.length * 0.07);
  score += Math.min(0.4, matchedPrice.length * 0.09);
  if (input.query.type === "watch_source" && matchedWatch.length > 0) score += 0.15;
  if (input.query.type === "price_source" && matchedPrice.length > 0) score += 0.15;
  if (input.query.type === "both" && (matchedWatch.length > 0 || matchedPrice.length > 0)) score += 0.08;
  if (isLikelyOfficialOrShopUrl(normalizedUrl)) score += 0.08;
  score -= Math.min(0.5, matchedExclusions.length * 0.18);

  const detectedType =
    matchedPrice.length > matchedWatch.length
      ? "price_source_candidate"
      : matchedWatch.length > matchedPrice.length
        ? "watch_source_candidate"
        : input.query.type === "price_source"
          ? "price_source_candidate"
          : input.query.type === "watch_source"
            ? "watch_source_candidate"
            : "unknown";

  const matchedKeywords = Array.from(new Set([...matchedWatch, ...matchedPrice]));
  const confidenceScore = Math.max(0, Math.min(1, Number(score.toFixed(2))));
  const reasonParts = [
    matchedKeywords.length > 0 ? `一致キーワード: ${matchedKeywords.join(", ")}` : "明確な一致キーワードが少ない",
    matchedExclusions.length > 0 ? `減点: ${matchedExclusions.join(", ")}` : null,
    `host: ${hostName(normalizedUrl)}`
  ].filter(Boolean);

  return {
    title: input.title.trim() || normalizedUrl,
    url: input.url,
    normalizedUrl,
    description: input.description?.trim() || null,
    detectedType,
    category: input.query.category || inferCategory(haystack),
    confidenceScore,
    matchedKeywords,
    reason: reasonParts.join(" / ")
  };
}

function inferCategory(value: string) {
  if (value.includes("ポケモン") || value.includes("ポケカ") || value.includes("pokemon")) return "pokemon";
  if (value.includes("トレカ") || value.includes("カード")) return "trading_card";
  if (value.includes("家電") || value.includes("ゲーム")) return "electronics";
  if (value.includes("文具") || value.includes("stationery")) return "stationery";
  return "other";
}

function isLikelyOfficialOrShopUrl(value: string) {
  try {
    const url = new URL(value);
    return !["x.com", "twitter.com", "facebook.com", "instagram.com", "youtube.com"].includes(url.hostname.replace(/^www\./, ""));
  } catch {
    return false;
  }
}
