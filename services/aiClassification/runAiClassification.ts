import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { classifyDiscoveredSource } from "./classifyDiscoveredSource";
import { classifyLotteryListing } from "./classifyLotteryListing";
import { hasOpenAiApiKey } from "./openAiClient";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type AiClassificationRunResult = {
  skipped: boolean;
  discoveredTargetCount: number;
  listingTargetCount: number;
  discoveredClassifiedCount: number;
  listingClassifiedCount: number;
  errorCount: number;
  errorMessage: string | null;
};

export async function runAiClassification(client: PrismaClient = defaultPrisma): Promise<AiClassificationRunResult> {
  if (!hasOpenAiApiKey()) {
    return {
      skipped: true,
      discoveredTargetCount: 0,
      listingTargetCount: 0,
      discoveredClassifiedCount: 0,
      listingClassifiedCount: 0,
      errorCount: 0,
      errorMessage: null
    };
  }

  const [sources, listings] = await Promise.all([
    client.discoveredSource.findMany({
      where: {
        status: "new",
        aiClassifiedAt: null,
        detectedType: { in: ["watch_source_candidate", "unknown"] }
      },
      orderBy: [{ confidenceScore: "desc" }, { discoveredAt: "desc" }],
      take: 20
    }),
    client.lotteryListing.findMany({
      where: {
        ignored: false,
        OR: [
          { aiClassifiedAt: null },
          { aiClassifiedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, updatedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        ]
      },
      orderBy: [{ detectedAt: "desc" }],
      take: 50
    })
  ]);

  let discoveredClassifiedCount = 0;
  let listingClassifiedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const source of sources) {
    try {
      await classifyDiscoveredSource(source, client);
      discoveredClassifiedCount += 1;
    } catch (error) {
      errorCount += 1;
      errors.push(`DiscoveredSource ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await delay(700);
  }

  for (const listing of listings) {
    try {
      await classifyLotteryListing(listing, client);
      listingClassifiedCount += 1;
    } catch (error) {
      errorCount += 1;
      errors.push(`LotteryListing ${listing.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await delay(700);
  }

  return {
    skipped: false,
    discoveredTargetCount: sources.length,
    listingTargetCount: listings.length,
    discoveredClassifiedCount,
    listingClassifiedCount,
    errorCount,
    errorMessage: errors.length > 0 ? errors.join("\n") : null
  };
}
