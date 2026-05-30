import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { classifyDiscoveryType } from "./rules";
import { evaluateSourceUsefulness } from "@/services/sourceDiscovery/sourceUsefulness";

export type ReclassifyResult = {
  discoveredChecked: number;
  discoveredUpdated: number;
  listingChecked: number;
  listingUpdated: number;
};

export async function reclassifySourcesAndListings(client: PrismaClient = defaultPrisma): Promise<ReclassifyResult> {
  const discoveredSources = await client.discoveredSource.findMany();
  const listings = await client.lotteryListing.findMany();
  let discoveredUpdated = 0;
  let listingUpdated = 0;

  for (const source of discoveredSources) {
    const classification = classifyDiscoveryType({
      url: source.normalizedUrl || source.url,
      title: source.title,
      description: source.description,
      rawText: source.rawText,
      applicationEndAt: source.aiApplicationEndAt,
      aiIsLotteryApplicationPage: source.aiIsLotteryApplicationPage,
      aiIsCurrentlyOpen: source.aiIsCurrentlyOpen,
      aiIsPastOrEnded: source.aiIsPastOrEnded,
      aiIsJustArticle: source.aiIsJustArticle,
      aiIsProductSalesPage: source.aiIsProductSalesPage,
      aiIsPriceBuybackPage: source.aiIsPriceBuybackPage
    });
    const aiExcludeReason = classification.excludeReason ?? source.aiExcludeReason;
    const usefulness = evaluateSourceUsefulness({
      title: source.title,
      normalizedUrl: source.normalizedUrl || source.url,
      description: source.description,
      detectedType: source.detectedType,
      discoveryType: classification.discoveryType,
      confidenceScore: source.confidenceScore,
      matchedKeywords: source.matchedKeywords,
      reason: source.reason,
      requiresReview: source.requiresReview,
      searchUrlTemplateCandidate: source.searchUrlTemplateCandidate,
      aiIsLotteryApplicationPage: source.aiIsLotteryApplicationPage,
      aiIsCurrentlyOpen: source.aiIsCurrentlyOpen,
      aiIsPastOrEnded: source.aiIsPastOrEnded,
      aiIsJustArticle: source.aiIsJustArticle,
      aiIsProductSalesPage: source.aiIsProductSalesPage,
      aiIsPriceBuybackPage: source.aiIsPriceBuybackPage,
      aiConfidenceScore: source.aiConfidenceScore,
      aiExcludeReason
    });

    if (
      source.discoveryType !== classification.discoveryType ||
      source.articlePublishedAt?.getTime() !== classification.articlePublishedAt?.getTime() ||
      (classification.excludeReason && source.aiExcludeReason !== classification.excludeReason) ||
      source.sourceUsefulness !== usefulness.sourceUsefulness ||
      source.aiRecommendedAction !== usefulness.aiRecommendedAction ||
      source.aiCanAutoRegister !== usefulness.aiCanAutoRegister ||
      source.aiCanAutoEnable !== usefulness.aiCanAutoEnable ||
      source.aiTrustLevel !== usefulness.aiTrustLevel ||
      source.aiSourceReason !== usefulness.aiSourceReason ||
      source.aiRiskReason !== usefulness.aiRiskReason
    ) {
      await client.discoveredSource.update({
        where: { id: source.id },
        data: {
          discoveryType: classification.discoveryType,
          articlePublishedAt: classification.articlePublishedAt,
          aiExcludeReason,
          confidenceScore: clamp(source.confidenceScore + classification.scoreAdjustment),
          ...usefulness
        }
      });
      discoveredUpdated += 1;
    }
  }

  for (const listing of listings) {
    const classification = classifyDiscoveryType({
      url: listing.normalizedUrl || listing.lotteryUrl,
      title: listing.title,
      description: listing.description,
      rawText: listing.rawText,
      applicationEndAt: listing.applicationEndAt ?? listing.aiApplicationEndAt,
      aiIsLotteryApplicationPage: listing.aiIsLotteryApplicationPage,
      aiIsCurrentlyOpen: listing.aiIsCurrentlyOpen,
      aiIsPastOrEnded: listing.aiIsPastOrEnded,
      aiIsJustArticle: listing.aiIsJustArticle,
      aiIsProductSalesPage: listing.aiIsProductSalesPage,
      aiIsPriceBuybackPage: listing.aiIsPriceBuybackPage
    });

    const nextStatus =
      classification.discoveryType === "ended_lottery_article" || classification.discoveryType === "lottery_news_article"
        ? "ended"
        : listing.status;

    if (
      listing.discoveryType !== classification.discoveryType ||
      listing.articlePublishedAt?.getTime() !== classification.articlePublishedAt?.getTime() ||
      listing.status !== nextStatus ||
      (classification.excludeReason && listing.aiExcludeReason !== classification.excludeReason)
    ) {
      await client.lotteryListing.update({
        where: { id: listing.id },
        data: {
          discoveryType: classification.discoveryType,
          articlePublishedAt: classification.articlePublishedAt,
          aiExcludeReason: classification.excludeReason ?? listing.aiExcludeReason,
          status: nextStatus,
          confidenceScore: clamp(listing.confidenceScore + classification.scoreAdjustment)
        }
      });
      listingUpdated += 1;
    }
  }

  return {
    discoveredChecked: discoveredSources.length,
    discoveredUpdated,
    listingChecked: listings.length,
    listingUpdated
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}
