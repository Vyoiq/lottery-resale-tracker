import type { PrismaClient } from "@prisma/client";
import { computeApplicationPriority } from "@/lib/priority";

export async function recalculateListingPriority(prisma: PrismaClient, listingId: string) {
  const [listing, keywords] = await Promise.all([
    prisma.lotteryListing.findUnique({
      where: { id: listingId },
      include: { priceRecords: { orderBy: [{ price: "desc" }, { confidenceScore: "desc" }], take: 1 } }
    }),
    prisma.exclusionKeyword.findMany({ where: { enabled: true } })
  ]);
  if (!listing) return null;

  const result = computeApplicationPriority({
    listing,
    bestPriceConfidence: listing.priceRecords[0]?.confidenceScore,
    exclusionKeywords: keywords.map((item) => item.keyword)
  });

  return prisma.lotteryListing.update({
    where: { id: listingId },
    data: {
      applicationPriorityScore: result.score,
      applicationPriorityLabel: result.label
    }
  });
}

export async function recalculateAllListingPriorities(prisma: PrismaClient) {
  const listings = await prisma.lotteryListing.findMany({ select: { id: true } });
  for (const listing of listings) {
    await recalculateListingPriority(prisma, listing.id);
  }
}
