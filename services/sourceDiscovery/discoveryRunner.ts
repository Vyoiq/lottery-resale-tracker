import type { DiscoveredSource, PrismaClient } from "@prisma/client";
import { getOperationSettings } from "@/lib/appSettings";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { candidateSearchTemplate, hostName } from "./queryBuilder";
import { classifySourceCandidate, type ClassifiedSourceCandidate } from "./sourceClassifier";
import { saveDiscoveredSources } from "./saveDiscoveredSources";
import { discoverFromKnownPublicPages } from "./providers/presetLinkProvider";
import { discoverFromSearchRss } from "./providers/rssSearchProvider";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type SourceDiscoveryResult = {
  queryCount: number;
  foundCount: number;
  newCount: number;
  updatedCount: number;
  autoAddedWatchCount: number;
  autoAddedPriceCount: number;
  errorCount: number;
  errorMessage: string | null;
};

export async function runSourceDiscovery(client: PrismaClient = defaultPrisma): Promise<SourceDiscoveryResult> {
  const settings = await getOperationSettings(client);
  const queries = await client.discoveryQuery.findMany({
    where: { enabled: true },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });

  let foundCount = 0;
  let newCount = 0;
  let updatedCount = 0;
  let autoAddedWatchCount = 0;
  let autoAddedPriceCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const query of queries) {
    try {
      const rawCandidates = [
        ...(await discoverFromSearchRss(query)),
        ...(await discoverFromKnownPublicPages(query))
      ];
      const classified = rawCandidates
        .map((candidate) => classifySourceCandidate({ ...candidate, query }))
        .filter((candidate): candidate is ClassifiedSourceCandidate => Boolean(candidate))
        .filter((candidate) => candidate.confidenceScore >= 0.25);

      foundCount += classified.length;
      const saved = await saveDiscoveredSources({ prisma: client, discoveryQueryId: query.id, candidates: classified });
      newCount += saved.newCount;
      updatedCount += saved.updatedCount;

      if (settings.sourceDiscoveryMode !== "candidates_only") {
        for (const id of saved.savedIds) {
          const source = await client.discoveredSource.findUnique({ where: { id } });
          if (!source || source.status !== "new") continue;
          if (
            settings.sourceDiscoveryMode === "auto_add_high_confidence_disabled" &&
            source.confidenceScore < settings.sourceDiscoveryAutoAddMinConfidence
          ) {
            continue;
          }
          if (source.detectedType === "watch_source_candidate") {
            const added = await addDiscoveredSourceAsWatchSource(source.id, client);
            if (added) autoAddedWatchCount += 1;
          } else if (source.detectedType === "price_source_candidate") {
            const added = await addDiscoveredSourceAsPriceSource(source.id, client);
            if (added) autoAddedPriceCount += 1;
          }
        }
      }
    } catch (error) {
      errorCount += 1;
      errors.push(`${query.name}: ${error instanceof Error ? error.message : String(error)}`);
    }

    await delay(1200);
  }

  return {
    queryCount: queries.length,
    foundCount,
    newCount,
    updatedCount,
    autoAddedWatchCount,
    autoAddedPriceCount,
    errorCount,
    errorMessage: errors.length > 0 ? errors.join("\n") : null
  };
}

export async function addDiscoveredSourceAsWatchSource(id: string, client: PrismaClient = defaultPrisma) {
  const source = await client.discoveredSource.findUnique({ where: { id } });
  if (!source || source.status === "ignored") return false;
  const existing = await client.watchSource.findUnique({ where: { url: source.normalizedUrl } });
  if (!existing) {
    await client.watchSource.create({
      data: {
        name: source.title.slice(0, 120),
        storeName: hostName(source.normalizedUrl),
        url: source.normalizedUrl,
        type: source.normalizedUrl.endsWith(".xml") || source.normalizedUrl.includes("rss") ? "rss" : "html",
        enabled: false,
        memo: buildMemo(source)
      }
    });
  }
  await client.discoveredSource.update({ where: { id }, data: { status: "added_watch_source" } });
  return true;
}

export async function addDiscoveredSourceAsPriceSource(id: string, client: PrismaClient = defaultPrisma) {
  const source = await client.discoveredSource.findUnique({ where: { id } });
  if (!source || source.status === "ignored") return false;
  const searchUrlTemplate = candidateSearchTemplate(source.normalizedUrl);
  const existing = await client.priceSource.findFirst({
    where: { OR: [{ baseUrl: source.normalizedUrl }, { searchUrlTemplate }] }
  });
  if (!existing) {
    await client.priceSource.create({
      data: {
        name: source.title.slice(0, 120),
        shopName: hostName(source.normalizedUrl),
        baseUrl: source.normalizedUrl,
        searchUrlTemplate,
        enabled: false,
        memo: `${buildMemo(source)}\n\n検索URLテンプレートは自動推定です。有効化前に必ず確認してください。`
      }
    });
  }
  await client.discoveredSource.update({ where: { id }, data: { status: "added_price_source" } });
  return true;
}

export async function ignoreDiscoveredSource(id: string, client: PrismaClient = defaultPrisma) {
  await client.discoveredSource.update({ where: { id }, data: { status: "ignored" } });
}

function buildMemo(source: DiscoveredSource) {
  return [
    "Source Discovery から追加しました。",
    "追加時点では enabled: false です。有効化前にURL、利用規約、アクセス頻度を確認してください。",
    source.reason ? `検出理由: ${source.reason}` : null,
    source.description ? `説明: ${source.description}` : null
  ].filter(Boolean).join("\n");
}
