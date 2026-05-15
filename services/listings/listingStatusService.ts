import type { LotteryListing, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

const endedTextPattern = /(終了|受付終了|応募終了|販売終了)/;
const oldAnnouncementThresholdDays = 14;

type ListingStatusInput = Pick<
  LotteryListing,
  "applicationEndAt" | "purchaseDeadlineAt" | "resultAnnouncementAt" | "title" | "rawText" | "ignored"
>;

export function inferListingStatus(listing: ListingStatusInput, now = new Date()) {
  if (listing.ignored) return "ignored";
  if (listing.applicationEndAt) {
    return listing.applicationEndAt.getTime() >= now.getTime() ? "active" : "ended";
  }
  if (listing.purchaseDeadlineAt && listing.purchaseDeadlineAt.getTime() < now.getTime()) {
    return "ended";
  }
  if (
    listing.resultAnnouncementAt &&
    now.getTime() - listing.resultAnnouncementAt.getTime() >= oldAnnouncementThresholdDays * 24 * 60 * 60 * 1000
  ) {
    return "ended";
  }
  if (endedTextPattern.test(`${listing.title} ${listing.rawText ?? ""}`)) {
    return "ended";
  }
  return "unknown";
}

export async function refreshListingStatuses(client: PrismaClient = defaultPrisma) {
  const listings = await client.lotteryListing.findMany({
    select: {
      id: true,
      status: true,
      ignored: true,
      applicationEndAt: true,
      purchaseDeadlineAt: true,
      resultAnnouncementAt: true,
      title: true,
      rawText: true
    }
  });
  const now = new Date();
  let activeCount = 0;
  let endedCount = 0;
  let unknownCount = 0;
  let ignoredCount = 0;
  let updatedCount = 0;

  for (const listing of listings) {
    const nextStatus = inferListingStatus(listing, now);
    if (nextStatus === "active") activeCount += 1;
    else if (nextStatus === "ended") endedCount += 1;
    else if (nextStatus === "ignored") ignoredCount += 1;
    else unknownCount += 1;

    if (listing.status !== nextStatus) {
      await client.lotteryListing.update({
        where: { id: listing.id },
        data: { status: nextStatus }
      });
      updatedCount += 1;
    }
  }

  return {
    checkedCount: listings.length,
    updatedCount,
    activeCount,
    endedCount,
    unknownCount,
    ignoredCount
  };
}
