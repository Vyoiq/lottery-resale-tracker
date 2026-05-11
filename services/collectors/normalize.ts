import { createHash } from "node:crypto";
import { confidenceReason, keywordScore } from "./keywordExtractor";
import { extractListingDates } from "./dateExtractor";

export type RawListingCandidate = {
  title: string;
  url: string;
  text: string;
  imageUrl?: string | null;
};

export type NormalizedListing = {
  title: string;
  productName: string;
  storeName: string;
  sourceName: string;
  sourceUrl: string;
  lotteryUrl: string;
  imageUrl?: string | null;
  description?: string | null;
  applicationStartAt?: Date | null;
  applicationEndAt?: Date | null;
  resultAnnouncementAt?: Date | null;
  purchaseDeadlineAt?: Date | null;
  status: string;
  confidenceScore: number;
  matchedKeywords?: string | null;
  confidenceReason?: string | null;
  extractedDatesRaw?: string | null;
  normalizedUrl?: string | null;
  contentHash?: string | null;
  rawText?: string | null;
};

export function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function absoluteUrl(url: string, baseUrl: string) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

export function normalizedUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid)/i.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function contentHash(text: string) {
  return createHash("sha256").update(normalizeWhitespace(text).toLowerCase()).digest("hex");
}

export function inferProductName(title: string) {
  const cleaned = normalizeWhitespace(title)
    .replace(/[【】\[\]]/g, " ")
    .replace(/抽選販売|抽選受付|抽選|応募受付|応募|受付中|予約販売|予約|販売開始|販売/g, " ");
  return normalizeWhitespace(cleaned).slice(0, 120) || normalizeWhitespace(title).slice(0, 120);
}

export function listingStatus(applicationEndAt?: Date | null) {
  if (!applicationEndAt) return "unknown";
  return applicationEndAt.getTime() >= Date.now() ? "active" : "ended";
}

export function normalizeCandidate(input: {
  candidate: RawListingCandidate;
  sourceName: string;
  sourceUrl: string;
  storeName: string;
}): NormalizedListing {
  const text = normalizeWhitespace(`${input.candidate.title} ${input.candidate.text}`);
  const dates = extractListingDates(text);
  const keywordResult = keywordScore(text);
  const lotteryUrl = absoluteUrl(input.candidate.url, input.sourceUrl);
  const cleanUrl = normalizedUrl(lotteryUrl);

  return {
    title: normalizeWhitespace(input.candidate.title).slice(0, 180),
    productName: inferProductName(input.candidate.title),
    storeName: input.storeName,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    lotteryUrl,
    imageUrl: input.candidate.imageUrl ? absoluteUrl(input.candidate.imageUrl, input.sourceUrl) : null,
    description: normalizeWhitespace(input.candidate.text).slice(0, 500),
    applicationStartAt: dates.applicationStartAt,
    applicationEndAt: dates.applicationEndAt,
    resultAnnouncementAt: dates.resultAnnouncementAt,
    purchaseDeadlineAt: dates.purchaseDeadlineAt,
    status: listingStatus(dates.applicationEndAt),
    confidenceScore: keywordResult.score,
    matchedKeywords: keywordResult.matched.join(", "),
    confidenceReason: confidenceReason(text),
    extractedDatesRaw: dates.raw.join(", "),
    normalizedUrl: cleanUrl,
    contentHash: contentHash(`${input.candidate.title}\n${input.candidate.text}`),
    rawText: text.slice(0, 4000)
  };
}
