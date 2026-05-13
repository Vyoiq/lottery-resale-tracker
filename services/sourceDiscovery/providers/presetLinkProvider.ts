import type { DiscoveryQuery, PriceSourcePreset, SourcePreset } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { textFromHtml, type DiscoveryCandidate } from "../queryBuilder";

type PageSource = {
  name: string;
  url: string;
};

export async function discoverFromKnownPublicPages(query: Pick<DiscoveryQuery, "query">): Promise<DiscoveryCandidate[]> {
  const [watchPresets, pricePresets] = await Promise.all([
    prisma.sourcePreset.findMany({ where: { url: { not: { contains: "example.com" } } }, take: 8 }),
    prisma.priceSourcePreset.findMany({ where: { baseUrl: { not: { contains: "example.com" } } }, take: 8 })
  ]);

  const sources = [
    ...watchPresets.map((preset) => sourceFromWatchPreset(preset)),
    ...pricePresets.map((preset) => sourceFromPricePreset(preset))
  ].filter((source): source is PageSource => Boolean(source));

  const results: DiscoveryCandidate[] = [];
  for (const source of sources.slice(0, 8)) {
    try {
      const response = await fetch(source.url, {
        headers: {
          "user-agent": "LotteryResaleTracker/1.0 (+local personal app; public pages only)"
        }
      });
      if (!response.ok) continue;
      const html = await response.text();
      results.push(...extractLinks(html, source.url, query.query).slice(0, 12));
    } catch {
      // Discovery should tolerate individual public page failures.
    }
  }

  return results;
}

function sourceFromWatchPreset(preset: SourcePreset): PageSource | null {
  if (preset.url.includes("example.com")) return null;
  return { name: preset.name, url: preset.url };
}

function sourceFromPricePreset(preset: PriceSourcePreset): PageSource | null {
  if (preset.baseUrl.includes("example.com")) return null;
  return { name: preset.name, url: preset.baseUrl };
}

function extractLinks(html: string, baseUrl: string, query: string): DiscoveryCandidate[] {
  const words = query.split(/\s+/).filter(Boolean);
  const candidates: DiscoveryCandidate[] = [];

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1];
    const text = textFromHtml(match[2]);
    const haystack = `${text} ${href}`;
    if (words.length > 0 && !words.some((word) => haystack.toLowerCase().includes(word.toLowerCase()))) continue;

    try {
      const url = new URL(href, baseUrl).toString();
      candidates.push({
        title: text || url,
        url,
        description: `既存プリセット/公開ページから抽出: ${baseUrl}`
      });
    } catch {
      // Ignore invalid links.
    }
  }

  return candidates;
}
