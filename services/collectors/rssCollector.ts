import type { WatchSource } from "@prisma/client";
import { looksLikeLottery } from "./keywordExtractor";
import { normalizeCandidate, normalizeWhitespace, type RawListingCandidate } from "./normalize";
import type { SourceCollectResult } from "./types";

function decodeCdata(text: string) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? normalizeWhitespace(decodeCdata(match[1]).replace(/<[^>]+>/g, " ")) : "";
}

export async function collectRss(source: WatchSource): Promise<SourceCollectResult> {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "LotteryResaleTracker/0.1 (+local personal tracker; public RSS only)",
      Accept: "application/rss+xml,application/atom+xml,application/xml,text/xml"
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status} ${response.statusText}`), { httpStatus: response.status });
  }

  const xml = await response.text();
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((match) => match[0]);
  const candidates: RawListingCandidate[] = [];

  for (const block of blocks) {
    const title = tag(block, "title");
    const description = tag(block, "description") || tag(block, "summary") || tag(block, "content");
    const link = tag(block, "link") || block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1] || source.url;
    const text = `${title} ${description}`;
    if (!title || !looksLikeLottery(text)) continue;
    candidates.push({ title, url: link, text });
  }

  const sliced = candidates.slice(0, 50);
  const listings = sliced.map((candidate) =>
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
    fetchedCount: sliced.length,
    matchedKeywords,
    candidates: sliced,
    listings
  };
}
