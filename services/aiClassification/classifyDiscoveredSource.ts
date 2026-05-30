import type { DiscoveredSource, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { stripTags } from "@/services/collectors/htmlCollector";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { classifyDiscoveryType } from "@/services/discoveryClassification/rules";
import { evaluateSourceUsefulness } from "@/services/sourceDiscovery/sourceUsefulness";
import { discoveredSourceUserPrompt } from "./prompts";
import { getAiModelLabel, requestAiClassification } from "./aiClient";

export async function classifyDiscoveredSource(source: DiscoveredSource, client: PrismaClient = defaultPrisma) {
  const rawText = source.rawText ?? (await fetchPublicPageTextWithFallback(source));
  const result = await requestAiClassification(
    discoveredSourceUserPrompt({
      url: source.url,
      title: source.title,
      description: source.description,
      rawText,
      matchedKeywords: source.matchedKeywords,
      detectedType: source.detectedType,
      discoveredAt: source.discoveredAt
    })
  );
  const discoveryClassification = classifyDiscoveryType({
    url: source.normalizedUrl || source.url,
    title: source.title,
    description: source.description,
    rawText,
    applicationEndAt: parseNullableDate(result.applicationEndAt),
    aiIsLotteryApplicationPage: result.isLotteryApplicationPage,
    aiIsCurrentlyOpen: result.isCurrentlyOpen,
    aiIsPastOrEnded: result.isPastOrEnded,
    aiIsJustArticle: result.isJustArticle,
    aiIsProductSalesPage: result.isProductSalesPage,
    aiIsPriceBuybackPage: result.isPriceBuybackPage
  });
  const aiExcludeReason = discoveryClassification.excludeReason ?? result.excludeReason;
  const usefulness = evaluateSourceUsefulness({
    title: source.title,
    normalizedUrl: source.normalizedUrl || source.url,
    description: source.description,
    detectedType: source.detectedType,
    discoveryType: discoveryClassification.discoveryType,
    confidenceScore: source.confidenceScore,
    matchedKeywords: source.matchedKeywords,
    reason: source.reason,
    requiresReview: source.requiresReview,
    searchUrlTemplateCandidate: source.searchUrlTemplateCandidate,
    aiIsLotteryApplicationPage: result.isLotteryApplicationPage,
    aiIsCurrentlyOpen: result.isCurrentlyOpen,
    aiIsPastOrEnded: result.isPastOrEnded,
    aiIsJustArticle: result.isJustArticle,
    aiIsProductSalesPage: result.isProductSalesPage,
    aiIsPriceBuybackPage: result.isPriceBuybackPage,
    aiConfidenceScore: result.confidenceScore,
    aiExcludeReason
  });

  await client.discoveredSource.update({
    where: { id: source.id },
    data: {
      rawText,
      aiClassifiedAt: new Date(),
      aiModel: getAiModelLabel(),
      aiIsLotteryApplicationPage: result.isLotteryApplicationPage,
      aiIsCurrentlyOpen: result.isCurrentlyOpen,
      aiIsPastOrEnded: result.isPastOrEnded,
      aiIsJustArticle: result.isJustArticle,
      aiIsProductSalesPage: result.isProductSalesPage,
      aiIsPriceBuybackPage: result.isPriceBuybackPage,
      aiCategory: result.category,
      aiConfidenceScore: result.confidenceScore,
      aiApplicationStartAt: parseNullableDate(result.applicationStartAt),
      aiApplicationEndAt: parseNullableDate(result.applicationEndAt),
      aiResultAnnouncementAt: parseNullableDate(result.resultAnnouncementAt),
      aiPurchaseDeadlineAt: parseNullableDate(result.purchaseDeadlineAt),
      articlePublishedAt: discoveryClassification.articlePublishedAt,
      discoveryType: discoveryClassification.discoveryType,
      aiReason: result.reason,
      aiExcludeReason,
      ...usefulness
    }
  });

  return result;
}

async function fetchPublicPageText(source: DiscoveredSource) {
  if (placeholderSourceReason({ name: source.title, url: source.url, memo: source.description })) {
    return source.description ?? "";
  }
  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "LotteryResaleTracker/1.1 (+local personal tracker; public pages only)",
      Accept: "text/html,application/xhtml+xml,text/plain"
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  return stripTags(await response.text()).replace(/\s+/g, " ").trim().slice(0, 3000);
}

async function fetchPublicPageTextWithFallback(source: DiscoveredSource) {
  try {
    return await fetchPublicPageText(source);
  } catch {
    return source.description ?? "";
  }
}

function parseNullableDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
