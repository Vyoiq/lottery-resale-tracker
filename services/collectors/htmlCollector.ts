import type { WatchSource } from "@prisma/client";
import { keywordScore, looksLikeLottery } from "./keywordExtractor";
import { absoluteUrl, normalizeCandidate, normalizeWhitespace, type RawListingCandidate } from "./normalize";
import type { SourceCollectResult } from "./types";

export function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

export function stripTags(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function extractTitle(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? normalizeWhitespace(stripTags(title)) : "";
}

function extractAnchorCandidates(html: string, sourceUrl: string) {
  const candidates: RawListingCandidate[] = [];
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorRegex)) {
    const href = absoluteUrl(match[1], sourceUrl);
    const text = normalizeWhitespace(stripTags(match[2]));
    if (text.length < 8 || !looksLikeLottery(text)) continue;
    candidates.push({ title: text.slice(0, 180), url: href, text });
  }
  return candidates;
}

function extractTextCandidates(html: string, sourceUrl: string) {
  const text = normalizeWhitespace(stripTags(html));
  const chunks = text.split(/(?=抽選|応募|受付|当選|限定|ポケモンカード|ポケカ|BOX|トレカ)/g);
  return chunks
    .map((chunk) => normalizeWhitespace(chunk))
    .filter((chunk) => chunk.length >= 20 && looksLikeLottery(chunk))
    .slice(0, 20)
    .map((chunk) => ({
      title: chunk.slice(0, 100),
      url: sourceUrl,
      text: chunk
    }));
}

export async function collectHtml(source: WatchSource): Promise<SourceCollectResult> {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "LotteryResaleTracker/0.1 (+local personal tracker; public pages only)",
      Accept: "text/html,application/xhtml+xml"
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status} ${response.statusText}`), { httpStatus: response.status });
  }

  const html = await response.text();
  const pageTitle = extractTitle(html);
  const rawCandidates = [...extractAnchorCandidates(html, source.url), ...extractTextCandidates(html, source.url)];
  const deduped = [...new Map(rawCandidates.map((candidate) => [`${candidate.url}:${candidate.title}`, candidate])).values()];

  if (deduped.length === 0 && pageTitle && looksLikeLottery(`${pageTitle} ${stripTags(html)}`)) {
    deduped.push({ title: pageTitle, url: source.url, text: stripTags(html).slice(0, 1200) });
  }

  const candidates = deduped.slice(0, 30);
  const listings = candidates.map((candidate) =>
    normalizeCandidate({
      candidate,
      sourceName: source.name,
      sourceUrl: source.url,
      storeName: source.storeName
    })
  );
  const matchedKeywords = [...new Set(listings.flatMap((listing) => (listing.matchedKeywords ?? "").split(", ").filter(Boolean)))];

  return {
    source,
    httpStatus: response.status,
    fetchedCount: candidates.length,
    matchedKeywords,
    candidates,
    listings
  };
}
