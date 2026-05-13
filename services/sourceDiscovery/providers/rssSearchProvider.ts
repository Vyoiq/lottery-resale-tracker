import type { DiscoveryQuery } from "@prisma/client";
import { buildSearchRssUrls, decodeXmlEntities, textFromHtml, type DiscoveryCandidate } from "../queryBuilder";

export async function discoverFromSearchRss(query: Pick<DiscoveryQuery, "query">): Promise<DiscoveryCandidate[]> {
  const results: DiscoveryCandidate[] = [];

  for (const url of buildSearchRssUrls(query.query)) {
    const response = await fetch(url, {
      headers: {
        "user-agent": "LotteryResaleTracker/1.0 (+local personal app; public RSS only)"
      }
    });
    if (!response.ok) throw new Error(`RSS検索に失敗しました: HTTP ${response.status}`);
    const xml = await response.text();

    for (const item of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
      const block = item[0];
      const title = readTag(block, "title");
      const link = readTag(block, "link");
      const description = textFromHtml(readTag(block, "description"));
      if (title && link) {
        results.push({ title, url: link, description });
      }
    }
  }

  return results;
}

function readTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1]).trim() : "";
}
