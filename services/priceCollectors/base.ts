import { prisma } from "@/lib/prisma";
import { recalculateListingPriority } from "@/lib/priorityService";
import { collectHtmlPrices } from "./htmlPriceCollector";
import { savePriceRecords } from "./savePriceRecords";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function testPriceCollection(input: {
  productName: string;
  priceSourceId?: string;
}) {
  const source = input.priceSourceId
    ? await prisma.priceSource.findUnique({ where: { id: input.priceSourceId } })
    : await prisma.priceSource.findFirst({ where: { enabled: true }, orderBy: { updatedAt: "desc" } });
  if (!source) throw new Error("有効なPriceSourceがありません。");
  return {
    source,
    result: await collectHtmlPrices({ source, productName: input.productName })
  };
}

export async function collectPricesForListing(listingId: string) {
  const listing = await prisma.lotteryListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("LotteryListingが見つかりません。");
  const sources = await prisma.priceSource.findMany({ where: { enabled: true } });
  if (sources.length === 0) {
    await prisma.lotteryListing.update({
      where: { id: listing.id },
      data: { priceStatus: "error", priceCheckedAt: new Date() }
    });
    await recalculateListingPriority(prisma, listing.id);
    throw new Error("有効なPriceSourceがありません。");
  }

  let found = 0;
  const errors: string[] = [];
  for (const source of sources) {
    try {
      const result = await collectHtmlPrices({ source, productName: listing.productName });
      await savePriceRecords({ prisma, listing, source, candidates: result.candidates });
      found += result.candidates.length;
      await prisma.priceSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date() } });
    } catch (error) {
      errors.push(`${source.shopName}: ${error instanceof Error ? error.message : String(error)}`);
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
  return { found, errors };
}

export async function runPriceCollectors(options: { dryRun?: boolean } = {}) {
  const listings = await prisma.lotteryListing.findMany({
    where: { status: { not: "ignored" } },
    orderBy: [{ priceCheckedAt: "asc" }, { detectedAt: "desc" }],
    take: 50
  });
  const sources = await prisma.priceSource.findMany({ where: { enabled: true } });
  const run = options.dryRun ? null : await prisma.priceCollectorRun.create({ data: { targetCount: listings.length } });

  let successCount = 0;
  let errorCount = 0;
  let newPriceCount = 0;
  let updatedPriceCount = 0;
  const errors: string[] = [];
  const dryRunItems: Array<{ productName: string; shopName: string; count: number; best?: number; keywords: string[] }> = [];

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
          await prisma.priceSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date() } });
        }
        listingFound += result.candidates.length;
      } catch (error) {
        errorCount += 1;
        errors.push(`${listing.productName} / ${source.shopName}: ${error instanceof Error ? error.message : String(error)}`);
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

  if (run) {
    return prisma.priceCollectorRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        targetCount: listings.length,
        successCount,
        errorCount,
        newPriceCount,
        updatedPriceCount,
        errorMessage: errors.length ? errors.join("\n").slice(0, 2000) : null
      }
    });
  }

  return {
    id: "dry-run",
    targetCount: listings.length,
    successCount,
    errorCount,
    newPriceCount,
    updatedPriceCount,
    errorMessage: errors.length ? errors.join("\n") : null,
    items: dryRunItems
  };
}
