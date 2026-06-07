import type { DiscoveredSource, PrismaClient } from "@prisma/client";
import { getOperationSettings } from "@/lib/appSettings";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { hasBuybackIntent, hasLotterySaleIntent, hasPokemonCardContext, pokemonSourceGate } from "@/lib/pokemonFilters";
import { isAllowedAmazonDiscoveryType, isAmazonDpUrl, hasAmazonMarketplaceRisk } from "@/services/discoveryClassification/rules";
import { inferAndSavePriceSourceTemplate, inferTemplatesForBasePriceSources } from "@/services/priceSources/templateInference";
import { addDiscoveredSourceAsPriceSource, addDiscoveredSourceAsWatchSource } from "./discoveryRunner";

export type SourceCuratorResult = {
  checkedCount: number;
  basePriceSourceCount: number;
  registeredWatchCount: number;
  registeredPriceCount: number;
  registeredBasePriceCount: number;
  templateInferenceSuccessCount: number;
  templateInferenceFailureCount: number;
  templateTestSuccessCount: number;
  templateTestFailureCount: number;
  watchCandidateCount: number;
  watchRegisterSuccessCount: number;
  autoEnableCandidateCount: number;
  enabledWatchCount: number;
  enabledPriceCount: number;
  manualReviewCount: number;
  ignoreCount: number;
  skippedCount: number;
  skippedReasons: string[];
  autoEnableSkippedReasons: string[];
};

const watchActions = new Set(["add_watch_source", "add_both"]);
const watchUsefulness = new Set(["watch_source", "both"]);
const priceActions = new Set(["add_price_source", "add_both"]);
const priceUsefulness = new Set(["price_source", "both"]);
const acceptedWatchTrust = new Set(["high", "medium"]);
const buybackKeywords = ["買取", "買取価格", "買取表", "高価買取", "未開封買取", "ポケカ", "ポケモンカード", "トレカ", "BOX", "スペシャルBOX"];
const watchKeywords = ["抽選", "応募", "受付", "ポケカ", "ポケモンカード", "トレカ"];
const blockedHosts = new Set(["bing.com", "www.bing.com", "youtu.be", "youtube.com", "www.youtube.com"]);

export async function runSourceCurator(
  client: PrismaClient = defaultPrisma,
  options: { registerLimit?: number; enableLimit?: number } = {}
): Promise<SourceCuratorResult> {
  const settings = await getOperationSettings(client);
  const registerLimit = Math.max(0, options.registerLimit ?? settings.aiSourceCuratorRegisterLimit);
  const enableLimit = Math.max(0, options.enableLimit ?? settings.aiSourceCuratorEnableLimit);
  const result: SourceCuratorResult = {
    checkedCount: 0,
    basePriceSourceCount: await client.priceSource.count({ where: { searchUrlTemplate: "" } }),
    registeredWatchCount: 0,
    registeredPriceCount: 0,
    registeredBasePriceCount: 0,
    templateInferenceSuccessCount: 0,
    templateInferenceFailureCount: 0,
    templateTestSuccessCount: 0,
    templateTestFailureCount: 0,
    watchCandidateCount: 0,
    watchRegisterSuccessCount: 0,
    autoEnableCandidateCount: 0,
    enabledWatchCount: 0,
    enabledPriceCount: 0,
    manualReviewCount: 0,
    ignoreCount: 0,
    skippedCount: 0,
    skippedReasons: [],
    autoEnableSkippedReasons: []
  };

  if (!settings.aiSourceCuratorEnabled) {
    result.skippedReasons.push("AI Source Curator disabled: 1");
    return result;
  }

  const existingTemplateInference = await inferTemplatesForBasePriceSources(client);
  result.basePriceSourceCount = existingTemplateInference.basePriceSourceCount;
  result.templateInferenceSuccessCount += existingTemplateInference.inferredCount;
  result.templateInferenceFailureCount += existingTemplateInference.inferenceFailedCount;
  result.templateTestSuccessCount += existingTemplateInference.testSuccessCount;
  result.templateTestFailureCount += existingTemplateInference.testFailedCount;
  result.enabledPriceCount += existingTemplateInference.enabledCount;

  const sources = await client.discoveredSource.findMany({
    where: { status: "new" },
    orderBy: [{ aiTrustLevel: "asc" }, { confidenceScore: "desc" }, { discoveredAt: "desc" }],
    take: Math.max(registerLimit * 3, 60)
  });

  let registeredTotal = 0;
  let enabledTotal = existingTemplateInference.enabledCount;
  const skippedReasons = new Map<string, number>();
  const autoEnableSkippedReasons = new Map<string, number>();
  for (const reason of existingTemplateInference.skippedReasons) addCount(skippedReasons, reason);

  for (const source of sources) {
    result.checkedCount += 1;
    const watchCandidate = isWatchCandidate(source);
    const priceCandidate = isPriceCandidate(source);
    if (watchCandidate) result.watchCandidateCount += 1;

    if (isPastOrEnded(source)) {
      result.skippedCount += 1;
      addCount(skippedReasons, "過去記事除外");
      continue;
    }

    if (isBlockedHost(source) || placeholderSourceReason({ name: source.title, url: source.normalizedUrl, memo: source.description })) {
      result.skippedCount += 1;
      addCount(skippedReasons, "ノイズ除外");
      continue;
    }

    if ((source.sourceUsefulness === "ignore" || source.aiRecommendedAction === "ignore") && !watchCandidate && !priceCandidate) {
      result.ignoreCount += 1;
      addCount(skippedReasons, "ignore判定");
      continue;
    }

    if ((source.sourceUsefulness === "manual_review" || source.aiRecommendedAction === "manual_review") && !watchCandidate && !priceCandidate) {
      result.manualReviewCount += 1;
      addCount(skippedReasons, isTimeout(source) ? "timeout" : "manual_review");
      continue;
    }

    if (!source.aiCanAutoRegister && !isRuleBasedRegisterCandidate(source)) {
      result.skippedCount += 1;
      addCount(skippedReasons, "自動登録不可判定");
      continue;
    }

    if (registeredTotal >= registerLimit) {
      result.skippedCount += 1;
      addCount(skippedReasons, "自動登録件数上限");
      continue;
    }

    const shouldRegisterWatch =
      settings.aiSourceCuratorAutoRegisterWatch &&
      watchCandidate &&
      (acceptedWatchTrust.has(source.aiTrustLevel) || source.discoveryType === "current_lottery_application" || isAllowedAmazonDiscoveryType(source.discoveryType));

    const shouldRegisterPrice =
      settings.aiSourceCuratorAutoRegisterPrice &&
      priceCandidate &&
      hasBuybackKeyword(source) &&
      (source.aiTrustLevel === "high" || isRuleBasedPriceCandidate(source));

    if (!shouldRegisterWatch && !shouldRegisterPrice) {
      result.skippedCount += 1;
      addCount(skippedReasons, buildConditionReason(source, watchCandidate, priceCandidate));
      continue;
    }

    if (shouldRegisterWatch) {
      const validation = await validateWatchSourceCandidate(source.normalizedUrl);
      if (!validation.success) {
        result.skippedCount += 1;
        addCount(skippedReasons, `WatchSource HTTP検証失敗: ${validation.reason}`);
      } else {
        const canEnable = source.aiCanAutoEnable && enabledTotal < enableLimit;
        if (canEnable) result.autoEnableCandidateCount += 1;
        const enabled = canEnable && settings.sourceDiscoveryAutoEnableHighTrust;
        if (canEnable && !enabled) addCount(autoEnableSkippedReasons, "WatchSource自動有効化設定OFF");
        const added = await addDiscoveredSourceAsWatchSource(source.id, client, { enabled });
        if (added) {
          result.registeredWatchCount += 1;
          result.watchRegisterSuccessCount += 1;
          registeredTotal += 1;
          if (enabled) {
            result.enabledWatchCount += 1;
            enabledTotal += 1;
          }
        } else {
          result.skippedCount += 1;
          addCount(skippedReasons, "WatchSource登録済み");
        }
      }
    }

    if (shouldRegisterPrice && registeredTotal < registerLimit) {
      const hasTemplate = Boolean(source.searchUrlTemplateCandidate?.includes("{keyword}"));
      const canEnable = source.aiCanAutoEnable && enabledTotal < enableLimit;
      if (canEnable) result.autoEnableCandidateCount += 1;
      const enabled = canEnable && settings.priceSourceDiscoveryAutoEnableHighTrust && hasTemplate;
      if (canEnable && !enabled) addCount(autoEnableSkippedReasons, hasTemplate ? "PriceSource自動有効化設定OFF" : "searchUrlTemplate未推定のため自動有効化しない");
      const added = await addDiscoveredSourceAsPriceSource(source.id, client, { enabled });
      if (added) {
        result.registeredPriceCount += 1;
        registeredTotal += 1;
        if (!hasTemplate) result.registeredBasePriceCount += 1;
        if (enabled) {
          result.enabledPriceCount += 1;
          enabledTotal += 1;
        }

        const priceSource = await client.priceSource.findFirst({ where: { baseUrl: source.normalizedUrl } });
        if (priceSource && !priceSource.searchUrlTemplate.includes("{keyword}")) {
          const inferred = await inferAndSavePriceSourceTemplate(priceSource.id, client, {
            allowEnable: settings.priceSourceAutoEnableInferredTemplate && source.aiTrustLevel === "high"
          });
          result.templateInferenceSuccessCount += inferred.inferredCount;
          result.templateInferenceFailureCount += inferred.inferenceFailedCount;
          result.templateTestSuccessCount += inferred.testSuccessCount;
          result.templateTestFailureCount += inferred.testFailedCount;
          result.enabledPriceCount += inferred.enabledCount;
          if (inferred.enabledCount > 0) enabledTotal += inferred.enabledCount;
          for (const reason of inferred.skippedReasons) addCount(skippedReasons, reason);
          if (settings.priceSourceAutoEnableInferredTemplate && source.aiTrustLevel !== "high") {
            addCount(autoEnableSkippedReasons, "high trustではないため推定後も自動有効化しない");
          }
        }
      } else {
        result.skippedCount += 1;
        addCount(skippedReasons, "PriceSource登録済み");
      }
    }
  }

  result.skippedReasons = mapToLines(skippedReasons);
  result.autoEnableSkippedReasons = mapToLines(autoEnableSkippedReasons);
  return result;
}

function isWatchCandidate(source: DiscoveredSource) {
  if (!pokemonSourceGate(source, "watch").ok) return false;
  return (
    watchUsefulness.has(source.sourceUsefulness) ||
    watchActions.has(source.aiRecommendedAction) ||
    source.discoveryType === "current_lottery_application" ||
    isAllowedAmazonDiscoveryType(source.discoveryType)
  );
}

function isPriceCandidate(source: DiscoveredSource) {
  if (!pokemonSourceGate(source, "price").ok) return false;
  return (
    priceUsefulness.has(source.sourceUsefulness) ||
    priceActions.has(source.aiRecommendedAction) ||
    source.discoveryType === "price_buyback_page" ||
    source.detectedType === "price_source_candidate"
  );
}

function isRuleBasedRegisterCandidate(source: DiscoveredSource) {
  return source.discoveryType === "current_lottery_application" || isRuleBasedPriceCandidate(source);
}

function isRuleBasedPriceCandidate(source: DiscoveredSource) {
  return source.discoveryType === "price_buyback_page" || (source.detectedType === "price_source_candidate" && hasBuybackKeyword(source));
}

function isPastOrEnded(source: DiscoveredSource) {
  return (
    source.discoveryType === "ended_lottery_article" ||
    source.aiIsPastOrEnded === true ||
    source.aiIsCurrentlyOpen === false ||
    Boolean(source.aiExcludeReason?.includes("過去") || source.aiExcludeReason?.includes("終了"))
  );
}

function hasBuybackKeyword(source: DiscoveredSource) {
  const text = [
    source.title,
    source.description,
    source.reason,
    source.matchedKeywords,
    source.aiSourceReason,
    source.aiReason,
    source.rawText
  ]
    .filter(Boolean)
    .join(" ");
  return hasPokemonCardContext(text) && hasBuybackIntent(text);
}

function buildConditionReason(source: DiscoveredSource, watchCandidate: boolean, priceCandidate: boolean) {
  if (watchCandidate && !acceptedWatchTrust.has(source.aiTrustLevel) && source.discoveryType !== "current_lottery_application" && !isAllowedAmazonDiscoveryType(source.discoveryType)) return "watch_source 条件不足";
  if (priceCandidate && source.aiTrustLevel !== "high" && !isRuleBasedPriceCandidate(source)) return "price_source 条件不足";
  if (priceCandidate && !hasBuybackKeyword(source)) return "買取/トレカ系キーワード不足";
  return "watch_source / price_source 条件不足";
}

async function validateWatchSourceCandidate(url: string) {
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
    if (response.status !== 200) return { success: false, reason: `HTTP ${response.status}` };
    const text = (await response.text()).slice(0, 80000);
    if (!isAmazonDpUrl(url) && hasPokemonCardContext(text) && hasLotterySaleIntent(text)) {
      return { success: true, reason: "ポケモンカード系キーワードと抽選/応募/予約/招待キーワードを確認済み" };
    }
    if (isAmazonDpUrl(url)) {
      const lower = text.toLowerCase();
      const hasCard = ["ポケモンカード", "ポケカ", "拡張パック", "box", "pokemon card"].some((keyword) => lower.includes(keyword.toLowerCase()));
      if (!hasCard) return { success: false, reason: "Amazon商品ページだがポケカ/BOX系キーワードなし" };
      if (hasAmazonMarketplaceRisk(`${url} ${text}`)) return { success: false, reason: "Amazonマーケットプレイス/中古/外部出品者の可能性" };
      return { success: true, reason: "Amazon.co.jp dp/ASIN商品ページ OK" };
    }
    if (!watchKeywords.some((keyword) => text.includes(keyword))) return { success: false, reason: "抽選/応募/トレカ系キーワードなし" };
    return { success: true, reason: "OK" };
  } catch (error) {
    return { success: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

function isTimeout(source: DiscoveredSource) {
  return Boolean(source.aiRiskReason?.toLowerCase().includes("timeout") || source.aiRiskReason?.toLowerCase().includes("aborted"));
}

function isBlockedHost(source: DiscoveredSource) {
  try {
    return blockedHosts.has(new URL(source.normalizedUrl).hostname);
  } catch {
    return true;
  }
}

function addCount(reasons: Map<string, number>, reason: string) {
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
}

function mapToLines(reasons: Map<string, number>) {
  return [...reasons.entries()].map(([reason, count]) => `${reason}: ${count}`);
}
