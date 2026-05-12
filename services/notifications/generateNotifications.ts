import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { getOperationSettings } from "@/lib/appSettings";
import { buildNotificationCandidates } from "./notificationRules";

export type GenerateNotificationsResult = {
  checkedCount: number;
  candidateCount: number;
  createdCount: number;
  updatedCount: number;
};

export async function generateNotifications(client: PrismaClient = defaultPrisma): Promise<GenerateNotificationsResult> {
  const settings = await getOperationSettings(client);
  const listings = await client.lotteryListing.findMany({
    where: { ignored: false },
    include: {
      priceRecords: {
        orderBy: [{ price: "desc" }, { confidenceScore: "desc" }],
        take: 1
      }
    }
  });

  let candidateCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  const now = new Date();

  for (const listing of listings) {
    const candidates = buildNotificationCandidates(listing, now, {
      minProfit: settings.notificationMinProfit,
      minRoi: settings.notificationMinRoi
    });
    candidateCount += candidates.length;

    for (const candidate of candidates) {
      const existing = await client.notification.findFirst({
        where: {
          lotteryListingId: listing.id,
          type: candidate.type,
          read: false
        }
      });

      if (!existing) {
        await client.notification.create({
          data: {
            lotteryListingId: listing.id,
            type: candidate.type,
            title: candidate.title,
            message: candidate.message,
            severity: candidate.severity
          }
        });
        createdCount += 1;
        continue;
      }

      if (existing.title !== candidate.title || existing.message !== candidate.message || existing.severity !== candidate.severity) {
        await client.notification.update({
          where: { id: existing.id },
          data: {
            title: candidate.title,
            message: candidate.message,
            severity: candidate.severity
          }
        });
        updatedCount += 1;
      }
    }
  }

  return {
    checkedCount: listings.length,
    candidateCount,
    createdCount,
    updatedCount
  };
}
