import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { placeholderSourceReason } from "@/lib/sourceGuards";

export async function cleanupPlaceholderSources(client: PrismaClient = defaultPrisma) {
  const [watchSources, priceSources] = await Promise.all([
    client.watchSource.findMany({ where: { enabled: true } }),
    client.priceSource.findMany({ where: { enabled: true } })
  ]);

  let disabledWatchSourceCount = 0;
  let disabledPriceSourceCount = 0;
  const messages: string[] = [];

  for (const source of watchSources) {
    const reason = placeholderSourceReason(source);
    if (!reason) continue;
    await client.watchSource.update({
      where: { id: source.id },
      data: {
        enabled: false,
        lastCheckedAt: new Date(),
        lastSuccess: true,
        lastHttpStatus: null,
        lastFetchedCount: 0,
        lastNewListingCount: 0,
        lastMatchedKeywords: null,
        lastError: `プレースホルダーのため無効化: ${reason}`.slice(0, 500)
      }
    });
    disabledWatchSourceCount += 1;
    messages.push(`WatchSource ${source.name} (${source.url}): ${reason}`);
  }

  for (const source of priceSources) {
    const reason = placeholderSourceReason(source);
    if (!reason) continue;
    await client.priceSource.update({
      where: { id: source.id },
      data: {
        enabled: false,
        lastCheckedAt: new Date(),
        memo: appendSafetyMemo(source.memo, reason)
      }
    });
    disabledPriceSourceCount += 1;
    messages.push(`PriceSource ${source.name} (${source.searchUrlTemplate}): ${reason}`);
  }

  return {
    disabledWatchSourceCount,
    disabledPriceSourceCount,
    message: messages.length > 0 ? messages.join("\n") : "無効化が必要なプレースホルダーソースはありません。"
  };
}

function appendSafetyMemo(memo: string | null, reason: string) {
  const line = `プレースホルダーのため自動無効化: ${reason}`;
  if (memo?.includes(line)) return memo;
  return [memo, line].filter(Boolean).join("\n").slice(0, 2000);
}
