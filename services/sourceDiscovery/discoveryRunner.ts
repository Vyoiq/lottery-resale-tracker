import type { DiscoveredSource, PrismaClient } from "@prisma/client";
import { getOperationSettings } from "@/lib/appSettings";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { hostName } from "./queryBuilder";
import { classifySourceCandidate, type ClassifiedSourceCandidate } from "./sourceClassifier";
import { saveDiscoveredSources } from "./saveDiscoveredSources";
import { bingSearchProvider } from "./providers/bingSearchProvider";
import { braveSearchProvider } from "./providers/braveSearchProvider";
import { manualFallbackProvider } from "./providers/manualFallbackProvider";
import { publicSearchFeedProvider } from "./providers/publicSearchFeedProvider";
import { serpApiProvider } from "./providers/serpApiProvider";
import type { SearchProvider } from "./providers/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const providers: SearchProvider[] = [
  publicSearchFeedProvider,
  braveSearchProvider,
  bingSearchProvider,
  serpApiProvider,
  manualFallbackProvider
];

const pokemonWatchDiscoveryQueries = [
  { name: "ポケモンカード 抽選販売 受付中", query: "ポケモンカード 抽選販売 受付中", category: "pokemon" },
  { name: "ポケカ 抽選販売 受付中", query: "ポケカ 抽選販売 受付中", category: "pokemon" },
  { name: "ポケモンカード 応募受付中", query: "ポケモンカード 応募受付中", category: "pokemon" },
  { name: "ポケカ 予約 抽選", query: "ポケカ 予約 抽選", category: "pokemon" },
  { name: "ポケモンカード 招待販売", query: "ポケモンカード 招待販売", category: "pokemon" },
  { name: "ポケモンカード Amazon 招待", query: "ポケモンカード Amazon 招待", category: "pokemon" },
  { name: "ポケモンカード Amazon 予約", query: "ポケモンカード Amazon 予約", category: "pokemon" },
  { name: "ポケモンセンター スペシャルBOX 抽選", query: "ポケモンセンター スペシャルBOX 抽選", category: "pokemon" },
  { name: "ポケモンカード BOX 抽選", query: "ポケモンカード BOX 抽選", category: "pokemon" },
  { name: "ポケカ BOX 予約", query: "ポケカ BOX 予約", category: "pokemon" }
] as const;

const pokemonPriceDiscoveryQueries = [
  { name: "ポケモンカード 買取価格", query: "ポケモンカード 買取価格", category: "pokemon" },
  { name: "ポケカ 買取価格", query: "ポケカ 買取価格", category: "pokemon" },
  { name: "ポケモンカード 買取表", query: "ポケモンカード 買取表", category: "pokemon" },
  { name: "ポケカ 買取表", query: "ポケカ 買取表", category: "pokemon" },
  { name: "ポケモンカード BOX 買取", query: "ポケモンカード BOX 買取", category: "pokemon" },
  { name: "ポケカ BOX 買取", query: "ポケカ BOX 買取", category: "pokemon" },
  { name: "スペシャルBOX 買取価格", query: "スペシャルBOX 買取価格", category: "pokemon" },
  { name: "ポケモンセンター BOX 買取", query: "ポケモンセンター BOX 買取", category: "pokemon" }
] as const;

const defaultPriceDiscoveryQueries = [
  { name: "ポケモンカード 買取価格", query: "ポケモンカード 買取価格", category: "pokemon" },
  { name: "ポケカ 買取価格", query: "ポケカ 買取価格", category: "pokemon" },
  { name: "ポケモンカード 買取表", query: "ポケモンカード 買取表", category: "pokemon" },
  { name: "ポケカ 買取表", query: "ポケカ 買取表", category: "pokemon" },
  { name: "スペシャルBOX 買取価格", query: "スペシャルBOX 買取価格", category: "pokemon" },
  { name: "ポケモンセンター ヒロシマ BOX 買取", query: "ポケモンセンター ヒロシマ BOX 買取", category: "pokemon" },
  { name: "ポケモンカード BOX 買取検索", query: "ポケモンカード BOX 買取検索", category: "pokemon" },
  { name: "トレカ 買取価格 検索", query: "トレカ 買取価格 検索", category: "trading_card" },
  { name: "トレカ 買取表 ポケカ", query: "トレカ 買取表 ポケカ", category: "trading_card" }
] as const;

const currentWatchDiscoveryQueries = [
  { name: "ポケモンカード 抽選販売 受付中", query: "ポケモンカード 抽選販売 受付中", category: "pokemon" },
  { name: "ポケカ 抽選販売 受付中", query: "ポケカ 抽選販売 受付中", category: "pokemon" },
  { name: "ポケモンカード 応募受付中", query: "ポケモンカード 応募受付中", category: "pokemon" },
  { name: "ポケカ 予約 抽選 今日", query: "ポケカ 予約 抽選 今日", category: "pokemon" },
  { name: "ポケモンカード 抽選 2026", query: "ポケモンカード 抽選 2026", category: "pokemon" },
  { name: "トレカ 抽選販売 受付中", query: "トレカ 抽選販売 受付中", category: "trading_card" }
] as const;

const currentPriceDiscoveryQueries = [
  { name: "ポケモンカード 買取価格", query: "ポケモンカード 買取価格", category: "pokemon" },
  { name: "ポケカ 買取価格", query: "ポケカ 買取価格", category: "pokemon" },
  { name: "ポケモンカード 買取表", query: "ポケモンカード 買取表", category: "pokemon" },
  { name: "ポケカ 買取表", query: "ポケカ 買取表", category: "pokemon" },
  { name: "スペシャルBOX 買取価格", query: "スペシャルBOX 買取価格", category: "pokemon" },
  { name: "ポケモンセンター ヒロシマ BOX 買取", query: "ポケモンセンター ヒロシマ BOX 買取", category: "pokemon" },
  { name: "ポケモンカード BOX 買取検索", query: "ポケモンカード BOX 買取検索", category: "pokemon" },
  { name: "トレカ 買取価格 検索", query: "トレカ 買取価格 検索", category: "trading_card" },
  { name: "トレカ 買取表 ポケカ", query: "トレカ 買取表 ポケカ", category: "trading_card" }
] as const;

const fallbackWatchDiscoveryQueries = [
  { name: "ポケモンカード 抽選販売 受付中", query: "ポケモンカード 抽選販売 受付中", category: "pokemon" },
  { name: "ポケカ 抽選販売 受付中", query: "ポケカ 抽選販売 受付中", category: "pokemon" },
  { name: "ポケモンカード 応募受付中", query: "ポケモンカード 応募受付中", category: "pokemon" },
  { name: "ポケカ 予約 抽選", query: "ポケカ 予約 抽選", category: "pokemon" },
  { name: "トレカ 抽選販売 受付中", query: "トレカ 抽選販売 受付中", category: "trading_card" }
] as const;

export type SourceDiscoveryResult = {
  queryCount: number;
  foundCount: number;
  newCount: number;
  updatedCount: number;
  autoAddedWatchCount: number;
  autoAddedPriceCount: number;
  errorCount: number;
  errorMessage: string | null;
  providerMessages: string[];
};

export async function runSourceDiscovery(client: PrismaClient = defaultPrisma, options: { maxCandidates?: number } = {}): Promise<SourceDiscoveryResult> {
  return runDiscovery({ client, mode: "all", maxCandidates: options.maxCandidates });
}

export async function runPriceSourceDiscovery(client: PrismaClient = defaultPrisma, options: { maxCandidates?: number } = {}): Promise<SourceDiscoveryResult> {
  return runDiscovery({ client, mode: "price", maxCandidates: options.maxCandidates });
}

async function runDiscovery(input: {
  client: PrismaClient;
  mode: "all" | "price";
  maxCandidates?: number;
}): Promise<SourceDiscoveryResult> {
  const settings = await getOperationSettings(input.client);
  if (input.mode === "all") {
    await ensureCurrentWatchDiscoveryQueries(input.client);
  }
  if (input.mode === "price") {
    await ensureCurrentPriceDiscoveryQueries(input.client);
  }
  const forcedQueries =
    input.mode === "price"
      ? pokemonPriceDiscoveryQueries.map((query) => query.query)
      : pokemonWatchDiscoveryQueries.map((query) => query.query);
  const queries = await input.client.discoveryQuery.findMany({
    where: {
      OR: [{ enabled: true }, ...(forcedQueries.length > 0 ? [{ query: { in: forcedQueries } }] : [])],
      ...(input.mode === "price" ? { type: { in: ["price_source", "both"] } } : {})
    },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });

  let foundCount = 0;
  let newCount = 0;
  let updatedCount = 0;
  let autoAddedWatchCount = 0;
  let autoAddedPriceCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const providerMessages = new Set<string>();

  for (const query of queries) {
    try {
      const rawCandidates = [];
      for (const provider of providers) {
        try {
          const result = await provider.discover(query, { mode: input.mode });
          if (result.message) providerMessages.add(result.message);
          rawCandidates.push(...result.candidates);
        } catch (error) {
          errorCount += 1;
          errors.push(`${provider.name} / ${query.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const classified = rawCandidates
        .map((candidate) => classifySourceCandidate({ ...candidate, query }))
        .filter((candidate): candidate is ClassifiedSourceCandidate => Boolean(candidate))
        .filter((candidate) => candidate.confidenceScore >= 0.25)
        .filter((candidate) => input.mode !== "price" || candidate.detectedType === "price_source_candidate")
        .slice(0, input.maxCandidates ?? rawCandidates.length);

      foundCount += classified.length;
      const saved = await saveDiscoveredSources({ prisma: input.client, discoveryQueryId: query.id, candidates: classified });
      newCount += saved.newCount;
      updatedCount += saved.updatedCount;

      for (const id of saved.savedIds) {
        const source = await input.client.discoveredSource.findUnique({ where: { id } });
        if (!source || source.status !== "new") continue;

        if (input.mode === "price") {
          if (!shouldAutoAddPriceSource(settings.priceSourceDiscoveryMode, source, settings.sourceDiscoveryAutoAddMinConfidence)) {
            continue;
          }
          const added = await addDiscoveredSourceAsPriceSource(source.id, input.client, {
            enabled: settings.priceSourceDiscoveryAutoEnableHighTrust && source.aiCanAutoEnable
          });
          if (added) autoAddedPriceCount += 1;
          continue;
        }

        if (settings.sourceDiscoveryMode === "candidates_only") continue;
        if (!shouldAutoAddSource(settings.sourceDiscoveryMode, source, settings.sourceDiscoveryAutoAddMinConfidence)) continue;
        const shouldEnable = settings.sourceDiscoveryAutoEnableHighTrust && source.aiCanAutoEnable;
        if (source.aiRecommendedAction === "add_both") {
          const watchAdded = await addDiscoveredSourceAsWatchSource(source.id, input.client, { enabled: shouldEnable });
          const priceAdded = await addDiscoveredSourceAsPriceSource(source.id, input.client, { enabled: shouldEnable });
          if (watchAdded) autoAddedWatchCount += 1;
          if (priceAdded) autoAddedPriceCount += 1;
          continue;
        }
        if (source.aiRecommendedAction === "add_watch_source") {
          const added = await addDiscoveredSourceAsWatchSource(source.id, input.client, { enabled: shouldEnable });
          if (added) autoAddedWatchCount += 1;
          continue;
        }
        if (source.aiRecommendedAction === "add_price_source") {
          const added = await addDiscoveredSourceAsPriceSource(source.id, input.client, { enabled: shouldEnable });
          if (added) autoAddedPriceCount += 1;
          continue;
        }
        if (
          settings.sourceDiscoveryMode === "auto_add_high_confidence_disabled" &&
          source.confidenceScore < settings.sourceDiscoveryAutoAddMinConfidence
        ) {
          continue;
        }
        if (source.detectedType === "watch_source_candidate") {
          const added = await addDiscoveredSourceAsWatchSource(source.id, input.client, { enabled: false });
          if (added) autoAddedWatchCount += 1;
        } else if (source.detectedType === "price_source_candidate") {
          const added = await addDiscoveredSourceAsPriceSource(source.id, input.client, { enabled: false });
          if (added) autoAddedPriceCount += 1;
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
    errorMessage: errors.length > 0 ? errors.join("\n") : null,
    providerMessages: [...providerMessages]
  };
}

async function ensureCurrentWatchDiscoveryQueries(client: PrismaClient) {
  await ensureDiscoveryQueries(client, pokemonWatchDiscoveryQueries, "watch_source");
}

async function ensureCurrentPriceDiscoveryQueries(client: PrismaClient) {
  await ensureDiscoveryQueries(client, pokemonPriceDiscoveryQueries, "price_source");
}

async function ensureDiscoveryQueries(
  client: PrismaClient,
  defaultQueries: readonly { name: string; query: string; category: string }[],
  type: "watch_source" | "price_source"
) {
  const existing = await client.discoveryQuery.findMany({
    where: { query: { in: defaultQueries.map((query) => query.query) } },
    select: { query: true }
  });
  const existingQueries = new Set(existing.map((query) => query.query));
  const missing = defaultQueries.filter((query) => !existingQueries.has(query.query));
  if (missing.length === 0) return;
  await client.discoveryQuery.createMany({
    data: missing.map((query) => ({
      ...query,
      type,
      enabled: true
    }))
  });
}

export async function addDiscoveredSourceAsWatchSource(id: string, client: PrismaClient = defaultPrisma, options: { enabled?: boolean } = {}) {
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
        enabled: Boolean(options.enabled),
        memo: buildMemo(source)
      }
    });
  } else if (options.enabled && !existing.enabled) {
    await client.watchSource.update({ where: { id: existing.id }, data: { enabled: true } });
  }
  await client.discoveredSource.update({ where: { id }, data: { status: "added_watch_source" } });
  return true;
}

export async function addDiscoveredSourceAsPriceSource(id: string, client: PrismaClient = defaultPrisma, options: { enabled?: boolean } = {}) {
  const source = await client.discoveredSource.findUnique({ where: { id } });
  if (!source || source.status === "ignored") return false;
  const searchUrlTemplate = source.searchUrlTemplateCandidate ?? "";
  const existing = await client.priceSource.findFirst({
    where: {
      OR: [
        { baseUrl: source.normalizedUrl },
        ...(searchUrlTemplate ? [{ searchUrlTemplate }] : [])
      ]
    }
  });
  if (!existing) {
    await client.priceSource.create({
      data: {
        name: source.title.slice(0, 120),
        shopName: hostName(source.normalizedUrl),
        baseUrl: source.normalizedUrl,
        searchUrlTemplate,
        enabled: Boolean(options.enabled),
        memo: [
          buildMemo(source),
          searchUrlTemplate
            ? `PriceSource type: testable_price_source\n推定検索URL: ${searchUrlTemplate}`
            : "PriceSource type: base_price_source_needs_template\n検索URLテンプレートは要確認です。"
        ].join("\n\n")
      }
    });
  } else if (options.enabled && !existing.enabled) {
    await client.priceSource.update({ where: { id: existing.id }, data: { enabled: true } });
  }
  await client.discoveredSource.update({ where: { id }, data: { status: "added_price_source" } });
  return true;
}

export async function ignoreDiscoveredSource(id: string, client: PrismaClient = defaultPrisma) {
  await client.discoveredSource.update({ where: { id }, data: { status: "ignored" } });
}

function shouldAutoAddPriceSource(
  mode: string,
  source: Pick<DiscoveredSource, "confidenceScore" | "requiresReview" | "detectedType" | "aiCanAutoRegister" | "aiTrustLevel" | "aiRecommendedAction">,
  minConfidence: number
) {
  if (mode !== "auto_add_high_confidence_disabled") return false;
  if (!source.aiCanAutoRegister || source.aiTrustLevel !== "high") return false;
  if (source.aiRecommendedAction !== "add_price_source" && source.aiRecommendedAction !== "add_both") return false;
  return (
    source.detectedType === "price_source_candidate" &&
    !source.requiresReview &&
    source.confidenceScore >= minConfidence
  );
}

function shouldAutoAddSource(
  mode: string,
  source: Pick<DiscoveredSource, "confidenceScore" | "aiCanAutoRegister" | "aiTrustLevel" | "aiRecommendedAction">,
  minConfidence: number
) {
  if (!source.aiCanAutoRegister) return false;
  if (!["add_watch_source", "add_price_source", "add_both"].includes(source.aiRecommendedAction)) return false;
  if (mode === "auto_add_disabled") return true;
  return mode === "auto_add_high_confidence_disabled" && source.aiTrustLevel === "high" && source.confidenceScore >= minConfidence;
}

function buildMemo(source: DiscoveredSource) {
  return [
    "Source Discovery から追加しました。",
    "追加時点では enabled: false です。有効化前にURL、利用規約、アクセス頻度を確認してください。",
    source.providerName ? `provider: ${source.providerName}` : null,
    `sourceUsefulness: ${source.sourceUsefulness}`,
    `recommendedAction: ${source.aiRecommendedAction}`,
    `aiTrustLevel: ${source.aiTrustLevel}`,
    `aiCanAutoEnable: ${source.aiCanAutoEnable}`,
    `aiCanAutoRegister: ${source.aiCanAutoRegister}`,
    source.aiSourceReason ? `sourceReason: ${source.aiSourceReason}` : null,
    source.aiRiskReason ? `riskReason: ${source.aiRiskReason}` : null,
    source.reason ? `検出理由: ${source.reason}` : null,
    source.description ? `説明: ${source.description}` : null
  ]
    .filter(Boolean)
    .join("\n");
}
