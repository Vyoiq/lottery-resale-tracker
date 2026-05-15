import { PrismaClient } from "@prisma/client";
import type { NormalizedListing } from "./normalize";
import { inferListingStatus } from "@/services/listings/listingStatusService";

export type SaveListingsResult = {
  newListingCount: number;
  updatedListingCount: number;
  skippedCount: number;
};

export async function saveListings(prisma: PrismaClient, listings: NormalizedListing[]): Promise<SaveListingsResult> {
  let newListingCount = 0;
  let updatedListingCount = 0;
  let skippedCount = 0;
  const now = new Date();
  const seen = new Set<string>();

  for (const listing of listings) {
    const dedupeKey = `${listing.normalizedUrl ?? listing.lotteryUrl}:${listing.title}`;
    if (seen.has(dedupeKey)) {
      skippedCount += 1;
      continue;
    }
    seen.add(dedupeKey);

    const existing =
      (await prisma.lotteryListing.findUnique({ where: { lotteryUrl: listing.lotteryUrl } })) ??
      (listing.normalizedUrl
        ? await prisma.lotteryListing.findFirst({ where: { normalizedUrl: listing.normalizedUrl } })
        : null) ??
      (await prisma.lotteryListing.findFirst({
        where: {
          title: listing.title,
          productName: listing.productName,
          storeName: listing.storeName,
          applicationEndAt: listing.applicationEndAt ?? null
        }
      }));

    if (existing) {
      const nextStatus = inferListingStatus({
        ignored: existing.ignored,
        applicationEndAt: listing.applicationEndAt ?? null,
        purchaseDeadlineAt: listing.purchaseDeadlineAt ?? null,
        resultAnnouncementAt: listing.resultAnnouncementAt ?? null,
        title: listing.title,
        rawText: listing.rawText ?? null
      });
      await prisma.lotteryListing.update({
        where: { id: existing.id },
        data: {
          title: listing.title,
          productName: listing.productName,
          storeName: listing.storeName,
          sourceName: listing.sourceName,
          sourceUrl: listing.sourceUrl,
          imageUrl: listing.imageUrl,
          description: listing.description,
          applicationStartAt: listing.applicationStartAt,
          applicationEndAt: listing.applicationEndAt,
          resultAnnouncementAt: listing.resultAnnouncementAt,
          purchaseDeadlineAt: listing.purchaseDeadlineAt,
          status: nextStatus,
          confidenceScore: listing.confidenceScore,
          matchedKeywords: listing.matchedKeywords,
          confidenceReason: listing.confidenceReason,
          extractedDatesRaw: listing.extractedDatesRaw,
          normalizedUrl: listing.normalizedUrl,
          contentHash: listing.contentHash,
          rawText: listing.rawText,
          lastSeenAt: now
        }
      });
      updatedListingCount += 1;
    } else {
      await prisma.lotteryListing.create({
        data: {
          ...listing,
          detectedAt: now,
          lastSeenAt: now
        }
      });
      newListingCount += 1;
    }
  }

  return { newListingCount, updatedListingCount, skippedCount };
}
