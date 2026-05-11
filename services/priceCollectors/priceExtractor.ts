import { containsBox, productTokens } from "./normalizeProductName";
import { isLikelySameProduct, titleSimilarity } from "./titleMatcher";

export type PriceCandidate = {
  matchedTitle: string;
  price: number;
  sourceUrl: string;
  confidenceScore: number;
  rawText: string;
  priceKind: "buy" | "sell" | "unknown";
  usedKeyword?: string;
};

export type RejectedPriceCandidate = {
  matchedTitle: string;
  price?: number;
  rawText: string;
  reason: string;
  priceKind: "buy" | "sell" | "unknown";
  confidenceScore: number;
  usedKeyword?: string;
};

const pricePatterns = [
  /(?:買取価格|買取金額|買取保証|未開封買取|買取)?\s*[¥￥]\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})/g,
  /(?:買取価格|買取金額|買取保証|未開封買取|買取)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})\s*円/g
];

const buyWords = ["買取", "買取価格", "買取金額", "買取保証", "未開封買取"];
const sellWords = ["販売価格", "通販価格", "在庫", "売り切れ", "参考価格", "定価"];

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&yen;/g, "¥")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(value: string) {
  const price = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(price) || price < 100 || price > 10000000) return null;
  return Math.trunc(price);
}

function classifyPriceKind(text: string): "buy" | "sell" | "unknown" {
  if (buyWords.some((word) => text.includes(word))) return "buy";
  if (sellWords.some((word) => text.includes(word))) return "sell";
  return "unknown";
}

function scoreCandidate(input: {
  productName: string;
  text: string;
  title: string;
  priceKind: "buy" | "sell" | "unknown";
}) {
  const similarity = titleSimilarity(input.productName, input.title);
  let score = similarity * 0.65;

  if (input.priceKind === "buy") score += 0.2;
  if (input.text.includes("円") || input.text.includes("¥") || input.text.includes("￥")) score += 0.05;
  if (containsBox(input.productName) && containsBox(input.text)) score += 0.08;
  if (isLikelySameProduct(input.productName, input.title)) score += 0.08;

  if (input.priceKind === "sell") score -= 0.25;
  if (productTokens(input.title).length <= 1) score -= 0.15;
  if (!isLikelySameProduct(input.productName, input.text)) score -= 0.25;
  if (!buyWords.some((word) => input.text.includes(word))) score -= 0.08;

  return Math.max(0, Math.min(1, score));
}

export function extractPriceCandidates(input: {
  html: string;
  productName: string;
  sourceUrl: string;
  usedKeyword?: string;
}) {
  const text = stripTags(input.html);
  const accepted: PriceCandidate[] = [];
  const rejected: RejectedPriceCandidate[] = [];
  const windows = text.split(/(?=買取|買取価格|買取金額|買取保証|未開封|販売価格|通販価格|BOX|ボックス|スペシャルBOX|ポケモンカード|ポケカ)/g);

  for (const window of windows) {
    const chunk = window.trim();
    if (chunk.length < 8) continue;
    const priceKind = classifyPriceKind(chunk);
    const title = chunk.slice(0, 180);
    const hasProduct = isLikelySameProduct(input.productName, chunk);

    if (!/(円|¥|￥)/.test(chunk)) {
      if (hasProduct) rejected.push({ matchedTitle: title, rawText: chunk.slice(0, 1000), reason: "価格表記が見つからない", priceKind, confidenceScore: 0, usedKeyword: input.usedKeyword });
      continue;
    }

    for (const pattern of pricePatterns) {
      for (const match of chunk.matchAll(pattern)) {
        const price = parsePrice(match[1]);
        const confidenceScore = scoreCandidate({ productName: input.productName, text: chunk, title, priceKind });

        if (!price) {
          rejected.push({ matchedTitle: title, rawText: chunk.slice(0, 1000), reason: "価格の数値変換に失敗", priceKind, confidenceScore, usedKeyword: input.usedKeyword });
          continue;
        }
        if (!hasProduct) {
          rejected.push({ matchedTitle: title, price, rawText: chunk.slice(0, 1000), reason: "商品名が近くにない", priceKind, confidenceScore, usedKeyword: input.usedKeyword });
          continue;
        }
        if (priceKind === "sell" && confidenceScore < 0.65) {
          rejected.push({ matchedTitle: title, price, rawText: chunk.slice(0, 1000), reason: "販売価格の可能性が高い", priceKind, confidenceScore, usedKeyword: input.usedKeyword });
          continue;
        }
        if (confidenceScore < 0.35) {
          rejected.push({ matchedTitle: title, price, rawText: chunk.slice(0, 1000), reason: "confidenceScoreが低い", priceKind, confidenceScore, usedKeyword: input.usedKeyword });
          continue;
        }

        accepted.push({
          matchedTitle: title,
          price,
          sourceUrl: input.sourceUrl,
          confidenceScore,
          rawText: chunk.slice(0, 1000),
          priceKind,
          usedKeyword: input.usedKeyword
        });
      }
    }
  }

  const byKey = new Map<string, PriceCandidate>();
  for (const candidate of accepted) {
    const key = `${candidate.matchedTitle}:${candidate.price}`;
    const existing = byKey.get(key);
    if (!existing || existing.confidenceScore < candidate.confidenceScore) byKey.set(key, candidate);
  }

  return {
    candidates: [...byKey.values()].sort((a, b) => b.confidenceScore - a.confidenceScore || b.price - a.price),
    rejected: rejected.sort((a, b) => b.confidenceScore - a.confidenceScore).slice(0, 50)
  };
}
