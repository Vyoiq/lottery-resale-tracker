import type { DiscoveredSource, PrismaClient } from "@prisma/client";
import { getOperationSettings } from "@/lib/appSettings";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { hasAmazonMarketplaceRisk, isAllowedAmazonDiscoveryType, isAmazonDpUrl } from "@/services/discoveryClassification/rules";
import { testPriceSourceTemplate } from "@/services/priceSources/templateInference";

export type SafeSourceAutomationResult = {
  checkedWatchCount: number;
  checkedPriceCount: number;
  watchAutoEnabledCount: number;
  priceAutoEnabledCount: number;
  watchAutoDisabledCount: number;
  priceAutoDisabledCount: number;
  skippedReasons: string[];
  enabledReasons: string[];
  disabledReasons: string[];
};

const watchKeywords = ["抽選", "応募", "受付", "ポケカ", "ポケモンカード", "トレカ"];
const noiseWords = [
  "ブロードバンド",
  "WiMAX",
  "ワイヤレスゲート",
  "ゴールドポイント",
  "通常販売",
  "販売価格",
  "store/",
  "/store/",
  "broadband",
  "wimax",
  "mercari",
  "メルカリ",
  "ヤフオク",
  "SNS"
];

export async function runSafeSourceAutomation(
  client: PrismaClient = defaultPrisma,
  options: { watchLimit?: number; priceLimit?: number; minTrust?: string } = {}
): Promise<SafeSourceAutomationResult> {
  const settings = await getOperationSettings(client);
  const watchLimit = Math.max(0, options.watchLimit ?? settings.safeAutoEnableWatchLimit);
  const priceLimit = Math.max(0, options.priceLimit ?? settings.safeAutoEnablePriceLimit);
  const minTrust = options.minTrust ?? settings.safeAutoEnableMinTrust;
  const result: SafeSourceAutomationResult = {
    checkedWatchCount: 0,
    checkedPriceCount: 0,
    watchAutoEnabledCount: 0,
    priceAutoEnabledCount: 0,
    watchAutoDisabledCount: 0,
    priceAutoDisabledCount: 0,
    skippedReasons: [],
    enabledReasons: [],
    disabledReasons: []
  };

  await autoDisableUnsafeSources(client, result, settings.autoDisableFailureThreshold);

  if (settings.safeAutoEnableWatchSources && watchLimit > 0) {
    await autoEnableWatchSources(client, result, {
      minTrust,
      limit: watchLimit
    });
  } else {
    result.skippedReasons.push("WatchSource自動有効化は設定OFF");
  }

  if (settings.safeAutoEnablePriceSources && priceLimit > 0) {
    await autoEnablePriceSources(client, result, {
      minTrust,
      limit: priceLimit
    });
  } else {
    result.skippedReasons.push("PriceSource自動有効化は設定OFF");
  }

  return result;
}

async function autoEnableWatchSources(
  client: PrismaClient,
  result: SafeSourceAutomationResult,
  options: { minTrust: string; limit: number }
) {
  const sources = await client.watchSource.findMany({
    where: { enabled: false },
    orderBy: { updatedAt: "desc" },
    take: 50
  });

  for (const source of sources) {
    if (result.watchAutoEnabledCount >= options.limit) break;
    result.checkedWatchCount += 1;

    const discovery = await client.discoveredSource.findUnique({ where: { normalizedUrl: source.url } });
    const safety = basicWatchSafety(discovery, source, options.minTrust);
    if (!safety.ok) {
      result.skippedReasons.push(`${source.name}: ${safety.reason}`);
      continue;
    }

    const validation = await validateWatchUrl(source.url);
    if (!validation.success) {
      result.skippedReasons.push(`${source.name}: ${validation.reason}`);
      continue;
    }

    const reason = [
      "AI自動有効化: WatchSource",
      `理由: ${validation.reason}`,
      `AI信頼度 ${discovery?.aiTrustLevel}`,
      "HTTP 200",
      "抽選/応募/トレカ系HTML確認済み"
    ].join("\n");

    await client.watchSource.update({
      where: { id: source.id },
      data: {
        enabled: true,
        lastCheckedAt: new Date(),
        lastSuccess: true,
        lastHttpStatus: 200,
        lastFetchedCount: validation.length,
        lastMatchedKeywords: validation.keywords.join(", "),
        lastError: null,
        memo: appendMemo(source.memo, reason)
      }
    });
    result.watchAutoEnabledCount += 1;
    result.enabledReasons.push(`${source.name}: ${reason.replace(/\n/g, " / ")}`);
  }
}

async function autoEnablePriceSources(
  client: PrismaClient,
  result: SafeSourceAutomationResult,
  options: { minTrust: string; limit: number }
) {
  const sources = await client.priceSource.findMany({
    where: {
      enabled: false,
      searchUrlTemplate: { contains: "{keyword}" }
    },
    orderBy: { updatedAt: "desc" },
    take: 50
  });

  for (const source of sources) {
    if (result.priceAutoEnabledCount >= options.limit) break;
    result.checkedPriceCount += 1;

    const discovery = await client.discoveredSource.findUnique({ where: { normalizedUrl: source.baseUrl } });
    const safety = basicPriceSafety(discovery, source, options.minTrust);
    if (!safety.ok) {
      result.skippedReasons.push(`${source.shopName}: ${safety.reason}`);
      continue;
    }

    const test = await testPriceSourceTemplate(source.searchUrlTemplate);
    if (!test.success || test.httpStatus !== 200) {
      await client.priceSource.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          lastHttpStatus: test.httpStatus,
          failureCount: { increment: 1 },
          lastError: `自動有効化前テスト失敗: ${test.reason}`
        }
      });
      result.skippedReasons.push(`${source.shopName}: ${test.reason}`);
      continue;
    }

    const reason = [
      "AI自動有効化: PriceSource",
      "searchUrlTemplate推定成功",
      "テスト取得HTTP 200",
      "買取系HTML確認済み",
      `AI信頼度 ${discovery?.aiTrustLevel}`
    ].join("\n");

    await client.priceSource.update({
      where: { id: source.id },
      data: {
        enabled: true,
        lastCheckedAt: new Date(),
        lastSuccessAt: new Date(),
        lastHttpStatus: 200,
        successCount: { increment: 1 },
        lastError: null,
        memo: appendMemo(source.memo, reason)
      }
    });
    result.priceAutoEnabledCount += 1;
    result.enabledReasons.push(`${source.shopName}: ${reason.replace(/\n/g, " / ")}`);
  }
}

async function autoDisableUnsafeSources(client: PrismaClient, result: SafeSourceAutomationResult, threshold: number) {
  const [watchSources, priceSources] = await Promise.all([
    client.watchSource.findMany({ where: { enabled: true } }),
    client.priceSource.findMany({ where: { enabled: true } })
  ]);

  for (const source of watchSources) {
    const reason = await watchDisableReason(client, source, threshold);
    if (!reason) continue;
    await client.watchSource.update({
      where: { id: source.id },
      data: {
        enabled: false,
        lastError: reason,
        memo: appendMemo(source.memo, `自動停止: ${reason}`)
      }
    });
    result.watchAutoDisabledCount += 1;
    result.disabledReasons.push(`${source.name}: ${reason}`);
  }

  for (const source of priceSources) {
    const reason = priceDisableReason(source, threshold);
    if (!reason) continue;
    await client.priceSource.update({
      where: { id: source.id },
      data: {
        enabled: false,
        lastError: reason,
        memo: appendMemo(source.memo, `自動停止: ${reason}`)
      }
    });
    result.priceAutoDisabledCount += 1;
    result.disabledReasons.push(`${source.shopName}: ${reason}`);
  }
}

async function watchDisableReason(client: PrismaClient, source: { id: string; name: string; url: string; memo: string | null }, threshold: number) {
  const placeholder = placeholderSourceReason(source);
  if (placeholder) return `プレースホルダー/ノイズ判定に変わったため自動停止: ${placeholder}`;

  const discovery = await client.discoveredSource.findUnique({ where: { normalizedUrl: source.url } });
  if (discovery && (discovery.aiIsPastOrEnded || discovery.discoveryType === "ended_lottery_article" || discovery.aiIsJustArticle)) {
    return "過去記事または記事ページと判定されたため自動停止";
  }

  if (!source.memo?.includes("AI自動有効化")) return null;
  const items = await client.collectorRunItem.findMany({
    where: { watchSourceId: source.id },
    orderBy: { startedAt: "desc" },
    take: threshold
  });
  if (items.length >= threshold && items.every((item) => !item.success)) return `${threshold}回連続HTTPエラーのため自動停止`;
  if (items.length >= threshold && items.every((item) => item.success && item.fetchedCount === 0)) return `${threshold}回連続0件のため自動停止`;
  return null;
}

function priceDisableReason(
  source: { searchUrlTemplate: string; memo: string | null; failureCount: number; lastError: string | null },
  threshold: number
) {
  const placeholder = placeholderSourceReason(source);
  if (placeholder) return `プレースホルダー/ノイズ判定に変わったため自動停止: ${placeholder}`;
  if (!source.searchUrlTemplate.includes("{keyword}")) return "検索URLテンプレート未設定のため自動停止";
  if (!source.memo?.includes("AI自動有効化")) return null;
  const text = `${source.searchUrlTemplate} ${source.memo ?? ""} ${source.lastError ?? ""}`;
  if (hasNoise(text)) return "販売価格ページまたはノイズURLと判定されたため自動停止";
  if (source.failureCount >= threshold && source.lastError) return `${threshold}回以上の取得失敗のため自動停止`;
  return null;
}

function basicWatchSafety(
  discovery: DiscoveredSource | null,
  source: { name: string; url: string; memo: string | null },
  minTrust: string
) {
  const placeholder = placeholderSourceReason(source);
  if (placeholder) return { ok: false, reason: `プレースホルダー: ${placeholder}` };
  if (!discovery) return { ok: false, reason: "AI判定元のDiscoveredSourceがありません" };
  if (discovery.discoveryType !== "current_lottery_application" && !isAllowedAmazonDiscoveryType(discovery.discoveryType)) {
    return { ok: false, reason: `discoveryType=${discovery.discoveryType}` };
  }
  if (!discovery.aiCanAutoEnable) return { ok: false, reason: "aiCanAutoEnable=false" };
  if (!trustAllowed(discovery.aiTrustLevel, minTrust)) return { ok: false, reason: `AI信頼度不足: ${discovery.aiTrustLevel}` };
  if (discovery.aiRiskReason) return { ok: false, reason: `riskReasonあり: ${discovery.aiRiskReason}` };
  if (discovery.aiIsPastOrEnded || discovery.aiIsJustArticle) return { ok: false, reason: "過去記事または記事ページ" };
  if (isAllowedAmazonDiscoveryType(discovery.discoveryType) && !isAmazonDpUrl(source.url)) return { ok: false, reason: "Amazon dp/ASIN URLではありません" };
  if (isAllowedAmazonDiscoveryType(discovery.discoveryType) && hasAmazonMarketplaceRisk(`${source.url} ${source.memo ?? ""} ${discovery.title} ${discovery.description ?? ""}`)) {
    return { ok: false, reason: "Amazonマーケットプレイス/中古/外部出品者の可能性" };
  }
  if (hasNoise(`${source.url} ${source.memo ?? ""} ${discovery.title} ${discovery.description ?? ""}`)) return { ok: false, reason: "ノイズキーワードあり" };
  return { ok: true, reason: "OK" };
}

function basicPriceSafety(
  discovery: DiscoveredSource | null,
  source: { shopName: string; baseUrl: string; searchUrlTemplate: string; memo: string | null },
  minTrust: string
) {
  const placeholder = placeholderSourceReason(source);
  if (placeholder) return { ok: false, reason: `プレースホルダー: ${placeholder}` };
  if (!source.searchUrlTemplate.includes("{keyword}")) return { ok: false, reason: "searchUrlTemplate未設定" };
  if (!discovery) return { ok: false, reason: "AI判定元のDiscoveredSourceがありません" };
  if (!discovery.aiCanAutoEnable) return { ok: false, reason: "aiCanAutoEnable=false" };
  if (!trustAllowed(discovery.aiTrustLevel, minTrust)) return { ok: false, reason: `AI信頼度不足: ${discovery.aiTrustLevel}` };
  if (discovery.aiRiskReason) return { ok: false, reason: `riskReasonあり: ${discovery.aiRiskReason}` };
  if (hasNoise(`${source.baseUrl} ${source.searchUrlTemplate} ${source.memo ?? ""}`)) return { ok: false, reason: "フリマ/SNS/販売価格系ノイズあり" };
  return { ok: true, reason: "OK" };
}

async function validateWatchUrl(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "LotteryResaleTracker/1.0 (+local personal use)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    const html = await response.text();
    if (response.status !== 200) return { success: false, reason: `HTTP ${response.status}`, length: html.length, keywords: [] };
    if (isAmazonDpUrl(url)) {
      const lower = html.toLowerCase();
      const keywords = ["ポケモンカード", "ポケカ", "拡張パック", "box", "pokemon card"].filter((keyword) => lower.includes(keyword.toLowerCase()));
      if (keywords.length === 0) return { success: false, reason: "Amazon商品ページだがポケカ/BOX系キーワードなし", length: html.length, keywords };
      if (hasAmazonMarketplaceRisk(`${url} ${html.slice(0, 20000)}`)) {
        return { success: false, reason: "Amazonマーケットプレイス/中古/外部出品者の可能性", length: html.length, keywords };
      }
      return { success: true, reason: `Amazon.co.jp販売候補 matched=${keywords.join(", ")}`, length: html.length, keywords };
    }
    const keywords = watchKeywords.filter((keyword) => html.includes(keyword));
    if (keywords.length === 0) return { success: false, reason: "抽選/応募/トレカ系キーワードなし", length: html.length, keywords };
    if (hasNoise(`${url} ${html.slice(0, 5000)}`)) return { success: false, reason: "ノイズキーワードあり", length: html.length, keywords };
    return { success: true, reason: `matched=${keywords.join(", ")}`, length: html.length, keywords };
  } catch (error) {
    return { success: false, reason: error instanceof Error ? error.message : String(error), length: 0, keywords: [] };
  } finally {
    clearTimeout(timeout);
  }
}

function trustAllowed(trustLevel: string, minTrust: string) {
  if (trustLevel === "high") return true;
  return minTrust === "medium" && trustLevel === "medium";
}

function hasNoise(text: string) {
  const lower = text.toLowerCase();
  return noiseWords.some((word) => lower.includes(word.toLowerCase()));
}

function appendMemo(memo: string | null, line: string) {
  if (memo?.includes(line)) return memo;
  return [memo, line].filter(Boolean).join("\n\n").slice(0, 3000);
}
