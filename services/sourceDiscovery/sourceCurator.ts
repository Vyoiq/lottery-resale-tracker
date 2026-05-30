import type { PrismaClient } from "@prisma/client";
import { getOperationSettings } from "@/lib/appSettings";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { addDiscoveredSourceAsPriceSource, addDiscoveredSourceAsWatchSource } from "./discoveryRunner";

export type SourceCuratorResult = {
  checkedCount: number;
  registeredWatchCount: number;
  registeredPriceCount: number;
  enabledWatchCount: number;
  enabledPriceCount: number;
  manualReviewCount: number;
  ignoreCount: number;
  skippedCount: number;
  skippedReasons: string[];
};

export async function runSourceCurator(client: PrismaClient = defaultPrisma): Promise<SourceCuratorResult> {
  const settings = await getOperationSettings(client);
  const result: SourceCuratorResult = {
    checkedCount: 0,
    registeredWatchCount: 0,
    registeredPriceCount: 0,
    enabledWatchCount: 0,
    enabledPriceCount: 0,
    manualReviewCount: 0,
    ignoreCount: 0,
    skippedCount: 0,
    skippedReasons: []
  };

  if (!settings.aiSourceCuratorEnabled) {
    result.skippedReasons.push("AI Source Curator is disabled in operation settings.");
    return result;
  }

  const sources = await client.discoveredSource.findMany({
    where: { status: "new" },
    orderBy: [{ aiTrustLevel: "asc" }, { confidenceScore: "desc" }, { discoveredAt: "desc" }],
    take: Math.max(settings.aiSourceCuratorRegisterLimit * 3, 50)
  });

  let registeredTotal = 0;
  let enabledTotal = 0;
  const skippedReasons = new Map<string, number>();

  for (const source of sources) {
    result.checkedCount += 1;

    if (source.sourceUsefulness === "ignore" || source.aiRecommendedAction === "ignore") {
      result.ignoreCount += 1;
      continue;
    }

    if (source.sourceUsefulness === "manual_review" || source.aiRecommendedAction === "manual_review") {
      result.manualReviewCount += 1;
      addSkipped(skippedReasons, source.aiRiskReason || "manual_review candidate.");
      continue;
    }

    if (!source.aiCanAutoRegister || source.aiTrustLevel !== "high") {
      result.skippedCount += 1;
      addSkipped(skippedReasons, source.aiRiskReason || "Not a high-trust auto-register candidate.");
      continue;
    }

    if (placeholderSourceReason({ name: source.title, url: source.normalizedUrl, memo: source.description })) {
      result.skippedCount += 1;
      addSkipped(skippedReasons, "Placeholder or noisy URL.");
      continue;
    }

    if (registeredTotal >= settings.aiSourceCuratorRegisterLimit) {
      result.skippedCount += 1;
      addSkipped(skippedReasons, "Auto-register limit reached.");
      continue;
    }

    const action = source.aiRecommendedAction;
    const canEnable = source.aiCanAutoEnable && enabledTotal < settings.aiSourceCuratorEnableLimit;

    if ((action === "add_watch_source" || action === "add_both") && settings.aiSourceCuratorAutoRegisterWatch) {
      const enabled = canEnable && settings.sourceDiscoveryAutoEnableHighTrust;
      const added = await addDiscoveredSourceAsWatchSource(source.id, client, { enabled });
      if (added) {
        result.registeredWatchCount += 1;
        registeredTotal += 1;
        if (enabled) {
          result.enabledWatchCount += 1;
          enabledTotal += 1;
        }
      } else {
        result.skippedCount += 1;
        addSkipped(skippedReasons, "WatchSource already exists.");
      }
    }

    if ((action === "add_price_source" || action === "add_both") && settings.aiSourceCuratorAutoRegisterPrice) {
      if (!source.searchUrlTemplateCandidate?.includes("{keyword}")) {
        result.skippedCount += 1;
        addSkipped(skippedReasons, "searchUrlTemplate could not be inferred.");
        continue;
      }

      const enabled = canEnable && settings.priceSourceDiscoveryAutoEnableHighTrust;
      const added = await addDiscoveredSourceAsPriceSource(source.id, client, { enabled });
      if (added) {
        result.registeredPriceCount += 1;
        registeredTotal += 1;
        if (enabled) {
          result.enabledPriceCount += 1;
          enabledTotal += 1;
        }
      } else {
        result.skippedCount += 1;
        addSkipped(skippedReasons, "PriceSource already exists.");
      }
    }
  }

  result.skippedReasons = [...skippedReasons.entries()].map(([reason, count]) => `${reason}: ${count}`);
  return result;
}

function addSkipped(reasons: Map<string, number>, reason: string) {
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
}
