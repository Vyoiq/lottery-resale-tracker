import { prisma } from "@/lib/prisma";
import { recalculateListingPriority } from "@/lib/priorityService";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { collectHtmlPrices } from "./htmlPriceCollector";
import { savePriceRecords } from "./savePriceRecords";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function usablePriceSources(options: { dryRun?: boolean } = {}) {
  const allSources = await prisma.priceSource.findMany({ where: { enabled: true } });
  const sources = [];
  const skipped: string[] = [];

  for (const source of allSources) {
    const reason = placeholderSourceReason(source);
    if (!source.searchUrlTemplate.includes("{keyword}")) {
      skipped.push(`${source.shopName}: 検索URLテンプレートが未設定`);
      if (!options.dryRun) {
        await prisma.priceSource.update({
          where: { id: source.id },
          data: {
            enabled: false,
            lastCheckedAt: new Date(),
            lastError: "検索URLテンプレートが未設定のため自動無効化"
          }
        });
      }
      continue;
    }
    if (!reason) {
      sources.push(source);
      continue;
    }
    const message = `${source.shopName}: ${source.searchUrlTemplate} / ${reason}`;
    skipped.push(message);
    if (!options.dryRun) {
      await prisma.priceSource.update({
        where: { id: source.id },
        data: {
          enabled: false,
          lastCheckedAt: new Date(),
          lastError: `プレースホルダーのためスキップ: ${reason}`,
          memo: appendPlaceholderMemo(source.memo, reason)
        }
      });
    }
  }

  return { sources, skipped };
}

export async function testPriceCollection(input: {
  productName: string;
  priceSourceId?: string;
}) {
  const source = input.priceSourceId
    ? await prisma.priceSource.findUnique({ where: { id: input.priceSourceId } })
    : await prisma.priceSource.findFirst({ where: { enabled: true }, orderBy: { updatedAt: "desc" } });
  if (!source) throw new Error("有効なPriceSourceがありません。");
  const reason = placeholderSourceReason(source);
  if (reason) throw new Error(`プレースホルダーのためスキップ: ${source.searchUrlTemplate} / ${reason}`);
  if (!source.searchUrlTemplate.includes("{keyword}")) throw new Error("検索URLテンプレートが未設定です");
  return {
    source,
    result: await collectHtmlPrices({ source, productName: input.productName })
  };
}

export async function collectPricesForListing(listingId: string) {
  const listing = await prisma.lotteryListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("LotteryListingが見つかりません。");
  const { sources, skipped } = await usablePriceSources();
  if (sources.length === 0) {
    await prisma.lotteryListing.update({
      where: { id: listing.id },
      data: { priceStatus: "error", priceCheckedAt: new Date() }
    });
    await recalculateListingPriority(prisma, listing.id);
    throw new Error(`有効な実URLのPriceSourceがありません。${skipped.length > 0 ? `プレースホルダーはスキップしました: ${skipped.join(" / ")}` : ""}`);
  }

  let found = 0;
  const errors: string[] = [];
  for (const source of sources) {
    try {
      const result = await collectHtmlPrices({ source, productName: listing.productName });
      await savePriceRecords({ prisma, listing, source, candidates: result.candidates });
      found += result.candidates.length;
      await prisma.priceSource.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          lastSuccessAt: new Date(),
          lastHttpStatus: result.httpStatus ?? null,
          successCount: { increment: 1 },
          lastError: null
        }
      });
    } catch (error) {
      errors.push(`${source.shopName}: ${error instanceof Error ? error.message : String(error)}`);
      await prisma.priceSource.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          failureCount: { increment: 1 },
          lastError: error instanceof Error ? error.message : String(error)
        }
      });
    }
    await delay(1500);
  }

  if (found === 0) {
    await prisma.lotteryListing.update({
      where: { id: listing.id },
      data: { priceStatus: errors.length > 0 ? "error" : "not_found", priceCheckedAt: new Date() }
    });
    await recalculateListingPriority(prisma, listing.id);
  }
  return { found, errors, skippedPlaceholderCount: skipped.length };
}

export async function runPriceCollectors(options: { dryRun?: boolean } = {}) {
  const listings = await prisma.lotteryListing.findMany({
    where: { status: { not: "ignored" } },
    orderBy: [{ priceCheckedAt: "asc" }, { detectedAt: "desc" }],
    take: 50
  });
  const { sources, skipped } = await usablePriceSources(options);
  const run = options.dryRun ? null : await prisma.priceCollectorRun.create({ data: { targetCount: listings.length } });

  let successCount = 0;
  let errorCount = 0;
  let newPriceCount = 0;
  let updatedPriceCount = 0;
  const errors: string[] = [];
  const dryRunItems: Array<{ productName: string; shopName: string; count: number; best?: number; keywords: string[] }> = [];

  if (sources.length === 0) {
    const message = [
      "有効な実URLのPriceSourceがないため価格取得をスキップしました。",
      skipped.length > 0 ? `プレースホルダーのためスキップ:\n${skipped.join("\n")}` : null
    ].filter(Boolean).join("\n");
    if (run) {
      const updatedRun = await prisma.priceCollectorRun.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          targetCount: listings.length,
          successCount: 0,
          errorCount: 0,
          newPriceCount: 0,
          updatedPriceCount: 0,
          errorMessage: message.slice(0, 2000)
        }
      });
      return { ...updatedRun, skippedPlaceholderCount: skipped.length, items: dryRunItems };
    }
    return {
      id: "dry-run",
      targetCount: listings.length,
      successCount: 0,
      errorCount: 0,
      newPriceCount: 0,
      updatedPriceCount: 0,
      skippedPlaceholderCount: skipped.length,
      errorMessage: message,
      items: dryRunItems
    };
  }

  for (const listing of listings) {
    let listingFound = 0;
    for (const source of sources) {
      try {
        const result = await collectHtmlPrices({ source, productName: listing.productName });
        if (options.dryRun) {
          dryRunItems.push({
            productName: listing.productName,
            shopName: source.shopName,
            count: result.candidates.length,
            best: result.candidates[0]?.price,
            keywords: result.keywords
          });
        } else {
          const saved = await savePriceRecords({ prisma, listing, source, candidates: result.candidates });
          newPriceCount += saved.newPriceCount;
          updatedPriceCount += saved.updatedPriceCount;
          await prisma.priceSource.update({
            where: { id: source.id },
            data: {
              lastCheckedAt: new Date(),
              lastSuccessAt: new Date(),
              lastHttpStatus: result.httpStatus ?? null,
              successCount: { increment: 1 },
              lastError: null
            }
          });
        }
        listingFound += result.candidates.length;
      } catch (error) {
        errorCount += 1;
        errors.push(`${listing.productName} / ${source.shopName}: ${error instanceof Error ? error.message : String(error)}`);
        if (!options.dryRun) {
          await prisma.priceSource.update({
            where: { id: source.id },
            data: {
              lastCheckedAt: new Date(),
              failureCount: { increment: 1 },
              lastError: error instanceof Error ? error.message : String(error)
            }
          });
        }
      }
      if (!options.dryRun) await delay(1500);
    }
    if (!options.dryRun && listingFound === 0) {
      await prisma.lotteryListing.update({
        where: { id: listing.id },
        data: { priceStatus: "not_found", priceCheckedAt: new Date() }
      });
      await recalculateListingPriority(prisma, listing.id);
    }
    successCount += 1;
  }

  const messages = [...skipped.map((item) => `プレースホルダーのためスキップ: ${item}`), ...errors];

  if (run) {
    const updatedRun = await prisma.priceCollectorRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        targetCount: listings.length,
        successCount,
        errorCount,
        newPriceCount,
        updatedPriceCount,
        errorMessage: messages.length ? messages.join("\n").slice(0, 2000) : null
      }
    });
    return { ...updatedRun, skippedPlaceholderCount: skipped.length, items: dryRunItems };
  }

  return {
    id: "dry-run",
    targetCount: listings.length,
    successCount,
    errorCount,
    newPriceCount,
    updatedPriceCount,
    skippedPlaceholderCount: skipped.length,
    errorMessage: messages.length ? messages.join("\n") : null,
    items: dryRunItems
  };
}

function appendPlaceholderMemo(memo: string | null, reason: string) {
  const line = `プレースホルダーのため自動無効化: ${reason}`;
  if (memo?.includes(line)) return memo;
  return [memo, line].filter(Boolean).join("\n").slice(0, 2000);
}
