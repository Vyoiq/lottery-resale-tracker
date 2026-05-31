import type { DiscoveredSource, PrismaClient } from "@prisma/client";
import { getOperationSettings } from "@/lib/appSettings";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { addDiscoveredSourceAsPriceSource, addDiscoveredSourceAsWatchSource } from "./discoveryRunner";

export type SourceCuratorResult = {
  checkedCount: number;
  registeredWatchCount: number;
  registeredPriceCount: number;
  registeredBasePriceCount: number;
  enabledWatchCount: number;
  enabledPriceCount: number;
  manualReviewCount: number;
  ignoreCount: number;
  skippedCount: number;
  skippedReasons: string[];
};

const watchActions = new Set(["add_watch_source", "add_both"]);
const watchUsefulness = new Set(["watch_source", "both"]);
const priceActions = new Set(["add_price_source", "add_both"]);
const priceUsefulness = new Set(["price_source", "both"]);
const acceptedWatchTrust = new Set(["high", "medium"]);
const cardOrBuybackKeywords = ["買取", "買取価格", "買取表", "高価買取", "未開封買取", "ポケカ", "ポケモンカード", "トレカ", "BOX", "スペシャルBOX"];
const blockedHosts = new Set(["bing.com", "www.bing.com", "youtu.be", "youtube.com", "www.youtube.com"]);

export async function runSourceCurator(client: PrismaClient = defaultPrisma): Promise<SourceCuratorResult> {
  const settings = await getOperationSettings(client);
  const result: SourceCuratorResult = {
    checkedCount: 0,
    registeredWatchCount: 0,
    registeredPriceCount: 0,
    registeredBasePriceCount: 0,
    enabledWatchCount: 0,
    enabledPriceCount: 0,
    manualReviewCount: 0,
    ignoreCount: 0,
    skippedCount: 0,
    skippedReasons: []
  };

  if (!settings.aiSourceCuratorEnabled) {
    result.skippedReasons.push("AI Source Curator disabled: 1");
    return result;
  }

  const sources = await client.discoveredSource.findMany({
    where: { status: "new" },
    orderBy: [{ aiTrustLevel: "asc" }, { confidenceScore: "desc" }, { discoveredAt: "desc" }],
    take: Math.max(settings.aiSourceCuratorRegisterLimit * 3, 50)
  });

  let registeredTotal = 0;
  let enabledTotal = 0;
  const skippedReasons = new Map<string, number>();

  for (const source of sources) {
    result.checkedCount += 1;
    const watchCandidate = isWatchCandidate(source);
    const priceCandidate = isPriceCandidate(source);

    if (isPastOrEnded(source)) {
      result.skippedCount += 1;
      addSkipped(skippedReasons, "過去記事除外");
      continue;
    }

    if (isBlockedHost(source) || placeholderSourceReason({ name: source.title, url: source.normalizedUrl, memo: source.description })) {
      result.skippedCount += 1;
      addSkipped(skippedReasons, "ノイズ除外");
      continue;
    }

    if ((source.sourceUsefulness === "ignore" || source.aiRecommendedAction === "ignore") && !watchCandidate && !priceCandidate) {
      result.ignoreCount += 1;
      addSkipped(skippedReasons, "ignore判定");
      continue;
    }

    if ((source.sourceUsefulness === "manual_review" || source.aiRecommendedAction === "manual_review") && !watchCandidate && !priceCandidate) {
      result.manualReviewCount += 1;
      addSkipped(skippedReasons, isTimeout(source) ? "timeout" : "manual_review");
      continue;
    }

    if (!source.aiCanAutoRegister && !isRuleBasedRegisterCandidate(source)) {
      result.skippedCount += 1;
      addSkipped(skippedReasons, "自動登録不可判定");
      continue;
    }

    if (registeredTotal >= settings.aiSourceCuratorRegisterLimit) {
      result.skippedCount += 1;
      addSkipped(skippedReasons, "自動登録件数上限");
      continue;
    }

    const canEnable = source.aiCanAutoEnable && enabledTotal < settings.aiSourceCuratorEnableLimit;
    const shouldRegisterWatch =
      settings.aiSourceCuratorAutoRegisterWatch &&
      watchCandidate &&
      (acceptedWatchTrust.has(source.aiTrustLevel) || source.discoveryType === "current_lottery_application");

    const shouldRegisterPrice =
      settings.aiSourceCuratorAutoRegisterPrice &&
      priceCandidate &&
      hasPriceKeyword(source) &&
      (source.aiTrustLevel === "high" || isRuleBasedPriceCandidate(source));

    if (!shouldRegisterWatch && !shouldRegisterPrice) {
      result.skippedCount += 1;
      addSkipped(skippedReasons, buildConditionReason(source, watchCandidate, priceCandidate));
      continue;
    }

    if (shouldRegisterWatch) {
      const enabled = canEnable && settings.sourceDiscoveryAutoEnableHighTrust;
      const added = await addDiscoveredSourceAsWatchSource(source.id, client, { enabled });
      if (added) {
        result.registeredWatchCount += 1;
        registeredTotal += 1;
        if (enabled) {
          result.enabledWatchCount += 1;
          enabledTotal += 1;
        }
      } else {
        result.skippedCount += 1;
        addSkipped(skippedReasons, "WatchSource登録済み");
      }
    }

    if (shouldRegisterPrice && registeredTotal < settings.aiSourceCuratorRegisterLimit) {
      const hasTemplate = Boolean(source.searchUrlTemplateCandidate?.includes("{keyword}"));
      const enabled = canEnable && settings.priceSourceDiscoveryAutoEnableHighTrust && hasTemplate;
      const added = await addDiscoveredSourceAsPriceSource(source.id, client, { enabled });
      if (added) {
        result.registeredPriceCount += 1;
        registeredTotal += 1;
        if (!hasTemplate) result.registeredBasePriceCount += 1;
        if (enabled) {
          result.enabledPriceCount += 1;
          enabledTotal += 1;
        }
      } else {
        result.skippedCount += 1;
        addSkipped(skippedReasons, "PriceSource登録済み");
      }
    }
  }

  result.skippedReasons = [...skippedReasons.entries()].map(([reason, count]) => `${reason}: ${count}`);
  return result;
}

function isWatchCandidate(source: DiscoveredSource) {
  return (
    watchUsefulness.has(source.sourceUsefulness) ||
    watchActions.has(source.aiRecommendedAction) ||
    source.discoveryType === "current_lottery_application" ||
    source.detectedType === "watch_source_candidate"
  );
}

function isPriceCandidate(source: DiscoveredSource) {
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
  return source.discoveryType === "price_buyback_page" || (source.detectedType === "price_source_candidate" && hasPriceKeyword(source));
}

function isPastOrEnded(source: DiscoveredSource) {
  return (
    source.discoveryType === "ended_lottery_article" ||
    source.aiIsPastOrEnded === true ||
    source.aiIsCurrentlyOpen === false ||
    Boolean(source.aiExcludeReason?.includes("過去") || source.aiExcludeReason?.includes("終了"))
  );
}

function hasPriceKeyword(source: DiscoveredSource) {
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
  return cardOrBuybackKeywords.some((keyword) => text.includes(keyword));
}

function buildConditionReason(source: DiscoveredSource, watchCandidate: boolean, priceCandidate: boolean) {
  if (watchCandidate && !acceptedWatchTrust.has(source.aiTrustLevel) && source.discoveryType !== "current_lottery_application") return "watch_source 条件不足";
  if (priceCandidate && source.aiTrustLevel !== "high" && !isRuleBasedPriceCandidate(source)) return "price_source 条件不足";
  if (priceCandidate && !hasPriceKeyword(source)) return "買取/トレカ系キーワード不足";
  return "watch_source / price_source 条件不足";
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

function addSkipped(reasons: Map<string, number>, reason: string) {
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
}
