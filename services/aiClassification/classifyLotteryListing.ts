import type { LotteryListing, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { lotteryListingUserPrompt } from "./prompts";
import { getOpenAiModel, requestAiClassification } from "./openAiClient";

export async function classifyLotteryListing(listing: LotteryListing, client: PrismaClient = defaultPrisma) {
  const result = await requestAiClassification(
    lotteryListingUserPrompt({
      lotteryUrl: listing.lotteryUrl,
      title: listing.title,
      productName: listing.productName,
      storeName: listing.storeName,
      description: listing.description,
      rawText: listing.rawText,
      matchedKeywords: listing.matchedKeywords,
      applicationStartAt: listing.applicationStartAt,
      applicationEndAt: listing.applicationEndAt,
      resultAnnouncementAt: listing.resultAnnouncementAt,
      purchaseDeadlineAt: listing.purchaseDeadlineAt
    })
  );

  const nextStatus =
    listing.ignored
      ? "ignored"
      : result.confidenceScore >= 0.7 && result.isPastOrEnded
        ? "ended"
        : result.confidenceScore >= 0.7 && result.isLotteryApplicationPage && result.isCurrentlyOpen === true
          ? "active"
          : listing.status;

  await client.lotteryListing.update({
    where: { id: listing.id },
    data: {
      aiClassifiedAt: new Date(),
      aiModel: getOpenAiModel(),
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
      aiReason: result.reason,
      aiExcludeReason: result.excludeReason,
      applicationStartAt: listing.applicationStartAt ?? parseNullableDate(result.applicationStartAt),
      applicationEndAt: listing.applicationEndAt ?? parseNullableDate(result.applicationEndAt),
      resultAnnouncementAt: listing.resultAnnouncementAt ?? parseNullableDate(result.resultAnnouncementAt),
      purchaseDeadlineAt: listing.purchaseDeadlineAt ?? parseNullableDate(result.purchaseDeadlineAt),
      status: nextStatus
    }
  });

  return result;
}

function parseNullableDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
