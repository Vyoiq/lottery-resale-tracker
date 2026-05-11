import type { PriceSource } from "@prisma/client";
import { extractPriceCandidates } from "./priceExtractor";
import { generateSearchKeywords } from "./searchKeywordGenerator";

export function buildSearchUrl(template: string, keyword: string) {
  return template.replace("{keyword}", encodeURIComponent(keyword));
}

export async function collectHtmlPrices(input: {
  source: PriceSource;
  productName: string;
  keywords?: string[];
}) {
  const keywords = input.keywords?.length ? input.keywords : generateSearchKeywords(input.productName);
  const searches: Array<{
    keyword: string;
    searchUrl: string;
    httpStatus: number;
    candidates: ReturnType<typeof extractPriceCandidates>["candidates"];
    rejected: ReturnType<typeof extractPriceCandidates>["rejected"];
  }> = [];

  for (const keyword of keywords) {
    const searchUrl = buildSearchUrl(input.source.searchUrlTemplate, keyword);
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "LotteryResaleTracker/0.1 (+local personal price checker; public pages only)",
        Accept: "text/html,application/xhtml+xml"
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw Object.assign(new Error(`HTTP ${response.status} ${response.statusText}`), { httpStatus: response.status });
    }

    const html = await response.text();
    const extracted = extractPriceCandidates({
      html,
      productName: input.productName,
      sourceUrl: searchUrl,
      usedKeyword: keyword
    });

    searches.push({
      keyword,
      searchUrl,
      httpStatus: response.status,
      candidates: extracted.candidates,
      rejected: extracted.rejected
    });
  }

  const allCandidates = searches.flatMap((search) => search.candidates);
  const allRejected = searches.flatMap((search) => search.rejected);
  const byKey = new Map<string, (typeof allCandidates)[number]>();
  for (const candidate of allCandidates) {
    const key = `${candidate.sourceUrl}:${candidate.matchedTitle}:${candidate.price}`;
    const existing = byKey.get(key);
    if (!existing || existing.confidenceScore < candidate.confidenceScore) byKey.set(key, candidate);
  }

  return {
    keywords,
    searchUrl: searches[0]?.searchUrl ?? buildSearchUrl(input.source.searchUrlTemplate, keywords[0] ?? input.productName),
    httpStatus: searches[0]?.httpStatus,
    searches,
    candidates: [...byKey.values()].sort((a, b) => b.confidenceScore - a.confidenceScore || b.price - a.price),
    rejected: allRejected
  };
}
