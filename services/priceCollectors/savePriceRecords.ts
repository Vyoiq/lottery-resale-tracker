import type { PrismaClient, LotteryListing, PriceSource } from "@prisma/client";
import { calculatePriceMetrics } from "@/lib/priceCalculations";
import { recalculateListingPriority } from "@/lib/priorityService";
import type { PriceCandidate } from "./priceExtractor";

export async function savePriceRecords(input: {
  prisma: PrismaClient;
  listing: LotteryListing;
  source: PriceSource;
  candidates: PriceCandidate[];
}) {
  let newPriceCount = 0;
  let updatedPriceCount = 0;

  for (const candidate of input.candidates) {
    const existing = await input.prisma.priceRecord.findUnique({
      where: {
        lotteryListingId_sourceUrl_matchedTitle: {
          lotteryListingId: input.listing.id,
          sourceUrl: candidate.sourceUrl,
          matchedTitle: candidate.matchedTitle
        }
      }
    });

    if (existing) {
      await input.prisma.priceRecord.update({
        where: { id: existing.id },
        data: {
          price: candidate.price,
          productName: input.listing.productName,
          shopName: input.source.shopName,
          confidenceScore: candidate.confidenceScore,
          extractedAt: new Date(),
          rawText: `[${candidate.priceKind}] keyword=${candidate.usedKeyword ?? ""}\n${candidate.rawText}`
        }
      });
      updatedPriceCount += 1;
    } else {
      await input.prisma.priceRecord.create({
        data: {
          lotteryListingId: input.listing.id,
          productName: input.listing.productName,
          shopName: input.source.shopName,
          price: candidate.price,
          sourceUrl: candidate.sourceUrl,
          matchedTitle: candidate.matchedTitle,
          confidenceScore: candidate.confidenceScore,
          rawText: `[${candidate.priceKind}] keyword=${candidate.usedKeyword ?? ""}\n${candidate.rawText}`
        }
      });
      newPriceCount += 1;
    }
  }

  await refreshListingBestPrice(input.prisma, input.listing.id);
  return { newPriceCount, updatedPriceCount };
}

export async function refreshListingBestPrice(prisma: PrismaClient, listingId: string) {
  const listing = await prisma.lotteryListing.findUnique({ where: { id: listingId } });
  if (!listing) return;

  const best = await prisma.priceRecord.findFirst({
    where: { lotteryListingId: listingId },
    orderBy: [{ price: "desc" }, { confidenceScore: "desc" }]
  });

  if (!best) {
    await prisma.lotteryListing.update({
      where: { id: listingId },
      data: {
        bestBuyPrice: null,
        estimatedProfit: null,
        profitRate: null,
        roi: null,
        priceMultiplier: null,
        priceCheckedAt: new Date(),
        priceStatus: "not_found"
      }
    });
    await recalculateListingPriority(prisma, listingId);
    return;
  }

  const metrics = calculatePriceMetrics({
    retailPrice: listing.retailPrice,
    bestBuyPrice: best.price
  });

  await prisma.lotteryListing.update({
    where: { id: listingId },
    data: {
      bestBuyPrice: best.price,
      estimatedProfit: metrics.estimatedProfit,
      profitRate: metrics.profitRate,
      roi: metrics.roi,
      priceMultiplier: metrics.priceMultiplier,
      priceCheckedAt: new Date(),
      priceStatus: "found"
    }
  });
  await recalculateListingPriority(prisma, listingId);
}
