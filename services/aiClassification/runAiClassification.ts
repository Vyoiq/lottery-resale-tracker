import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { classifyDiscoveredSource } from "./classifyDiscoveredSource";
import { classifyLotteryListing } from "./classifyLotteryListing";
import { getAiProviderStatus, isTerminalAiProviderError } from "./aiClient";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sourceLimit = 5;
const listingLimit = 10;

export type AiClassificationRunResult = {
  skipped: boolean;
  discoveredTargetCount: number;
  listingTargetCount: number;
  discoveredClassifiedCount: number;
  listingClassifiedCount: number;
  errorCount: number;
  errorMessage: string | null;
  provider: string;
  skipReason: string | null;
};

export async function runAiClassification(client: PrismaClient = defaultPrisma): Promise<AiClassificationRunResult> {
  const providerStatus = await getAiProviderStatus();
  if (!providerStatus.enabled) {
    return {
      skipped: true,
      discoveredTargetCount: 0,
      listingTargetCount: 0,
      discoveredClassifiedCount: 0,
      listingClassifiedCount: 0,
      errorCount: 0,
      errorMessage: null,
      provider: providerStatus.provider,
      skipReason: providerStatus.skipReason
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
      take: sourceLimit
    }),
    client.lotteryListing.findMany({
      where: {
        ignored: false,
        aiClassifiedAt: null
      },
      orderBy: [{ detectedAt: "desc" }],
      take: listingLimit
    })
  ]);

  let discoveredClassifiedCount = 0;
  let listingClassifiedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  let terminalApiFailure = false;

  for (const source of sources) {
    try {
      await classifyDiscoveredSource(source, client);
      discoveredClassifiedCount += 1;
    } catch (error) {
      errorCount += 1;
      errors.push(`DiscoveredSource ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
      if (isTerminalAiProviderError(error)) {
        terminalApiFailure = true;
        break;
      }
    }
    await delay(700);
  }

  for (const listing of terminalApiFailure ? [] : listings) {
    try {
      await classifyLotteryListing(listing, client);
      listingClassifiedCount += 1;
    } catch (error) {
      errorCount += 1;
      errors.push(`LotteryListing ${listing.id}: ${error instanceof Error ? error.message : String(error)}`);
      if (isTerminalAiProviderError(error)) {
        terminalApiFailure = true;
        break;
      }
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
    errorMessage: errors.length > 0 ? errors.join("\n") : null,
    provider: providerStatus.provider,
    skipReason: null
  };
}
