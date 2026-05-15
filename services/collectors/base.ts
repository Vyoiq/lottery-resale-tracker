import type { WatchSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { placeholderSourceReason } from "@/lib/sourceGuards";
import { collectHtml } from "./htmlCollector";
import { collectRss } from "./rssCollector";
import { saveListings } from "./saveListings";
import type { RunCollectorsOptions, SourceCollectResult } from "./types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SourceLike = Pick<WatchSource, "id" | "name" | "storeName" | "url" | "type" | "enabled">;

async function collectSource(source: SourceLike): Promise<SourceCollectResult> {
  const watchSource = source as WatchSource;
  if (source.type === "rss") return collectRss(watchSource);
  return collectHtml(watchSource);
}

function errorHttpStatus(error: unknown) {
  if (error && typeof error === "object" && "httpStatus" in error && typeof error.httpStatus === "number") {
    return error.httpStatus;
  }
  return null;
}

export async function runCollectors(options: RunCollectorsOptions = {}) {
  const sources = await prisma.watchSource.findMany({
    where: { enabled: true },
    orderBy: { updatedAt: "asc" }
  });

  const run = options.dryRun
    ? null
    : await prisma.collectorRun.create({ data: { startedAt: new Date(), targetSourceCount: sources.length } });

  let successCount = 0;
  let errorCount = 0;
  let newListingCount = 0;
  let updatedListingCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];
  const items: Array<{
    sourceName: string;
    storeName: string;
    sourceUrl: string;
    type: string;
    success: boolean;
    httpStatus?: number | null;
    fetchedCount: number;
    matchedKeywords: string[];
    newListingCount: number;
    updatedListingCount: number;
    skippedCount: number;
    errorMessage?: string | null;
    listings?: SourceCollectResult["listings"];
  }> = [];

  for (const source of sources) {
    const startedAt = new Date();
    const placeholderReason = placeholderSourceReason(source);
    if (placeholderReason) {
      const message = `プレースホルダーのためスキップ: ${placeholderReason}`;
      skippedCount += 1;

      if (!options.dryRun && run) {
        await prisma.collectorRunItem.create({
          data: {
            collectorRunId: run.id,
            watchSourceId: source.id,
            sourceName: source.name,
            storeName: source.storeName,
            sourceUrl: source.url,
            type: source.type,
            startedAt,
            finishedAt: new Date(),
            success: true,
            httpStatus: null,
            fetchedCount: 0,
            matchedKeywords: "placeholder",
            newListingCount: 0,
            updatedListingCount: 0,
            skippedCount: 1,
            errorMessage: message
          }
        });
        await prisma.watchSource.update({
          where: { id: source.id },
          data: {
            enabled: false,
            lastCheckedAt: new Date(),
            lastSuccess: true,
            lastHttpStatus: null,
            lastFetchedCount: 0,
            lastNewListingCount: 0,
            lastMatchedKeywords: null,
            lastError: message.slice(0, 500)
          }
        });
      }

      items.push({
        sourceName: source.name,
        storeName: source.storeName,
        sourceUrl: source.url,
        type: source.type,
        success: true,
        httpStatus: null,
        fetchedCount: 0,
        matchedKeywords: ["placeholder"],
        newListingCount: 0,
        updatedListingCount: 0,
        skippedCount: 1,
        errorMessage: message
      });
      continue;
    }

    try {
      const result = await collectSource(source);
      const saveResult = options.dryRun
        ? { newListingCount: result.listings.length, updatedListingCount: 0, skippedCount: 0 }
        : await saveListings(prisma, result.listings);

      newListingCount += saveResult.newListingCount;
      updatedListingCount += saveResult.updatedListingCount;
      skippedCount += saveResult.skippedCount;
      successCount += 1;

      if (!options.dryRun && run) {
        await prisma.collectorRunItem.create({
          data: {
            collectorRunId: run.id,
            watchSourceId: source.id,
            sourceName: source.name,
            storeName: source.storeName,
            sourceUrl: source.url,
            type: source.type,
            startedAt,
            finishedAt: new Date(),
            success: true,
            httpStatus: result.httpStatus,
            fetchedCount: result.fetchedCount,
            matchedKeywords: result.matchedKeywords.join(", "),
            newListingCount: saveResult.newListingCount,
            updatedListingCount: saveResult.updatedListingCount,
            skippedCount: saveResult.skippedCount
          }
        });
        await prisma.watchSource.update({
          where: { id: source.id },
          data: {
            lastCheckedAt: new Date(),
            lastSuccess: true,
            lastHttpStatus: result.httpStatus,
            lastFetchedCount: result.fetchedCount,
            lastNewListingCount: saveResult.newListingCount,
            lastMatchedKeywords: result.matchedKeywords.join(", "),
            lastError: null
          }
        });
      }

      items.push({
        sourceName: source.name,
        storeName: source.storeName,
        sourceUrl: source.url,
        type: source.type,
        success: true,
        httpStatus: result.httpStatus,
        fetchedCount: result.fetchedCount,
        matchedKeywords: result.matchedKeywords,
        newListingCount: saveResult.newListingCount,
        updatedListingCount: saveResult.updatedListingCount,
        skippedCount: saveResult.skippedCount,
        listings: result.listings
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const httpStatus = errorHttpStatus(error);
      errorCount += 1;
      errors.push(`${source.name}: ${message}`);

      if (!options.dryRun && run) {
        await prisma.collectorRunItem.create({
          data: {
            collectorRunId: run.id,
            watchSourceId: source.id,
            sourceName: source.name,
            storeName: source.storeName,
            sourceUrl: source.url,
            type: source.type,
            startedAt,
            finishedAt: new Date(),
            success: false,
            httpStatus,
            errorMessage: message.slice(0, 1000)
          }
        });
        await prisma.watchSource.update({
          where: { id: source.id },
          data: {
            lastCheckedAt: new Date(),
            lastSuccess: false,
            lastHttpStatus: httpStatus,
            lastFetchedCount: 0,
            lastNewListingCount: 0,
            lastMatchedKeywords: null,
            lastError: message.slice(0, 500)
          }
        });
      }

      items.push({
        sourceName: source.name,
        storeName: source.storeName,
        sourceUrl: source.url,
        type: source.type,
        success: false,
        httpStatus,
        fetchedCount: 0,
        matchedKeywords: [],
        newListingCount: 0,
        updatedListingCount: 0,
        skippedCount: 0,
        errorMessage: message
      });
    }

    if (!options.dryRun) await delay(1500);
  }

  if (!run) {
    return {
      id: "dry-run",
      startedAt: new Date(),
      finishedAt: new Date(),
      targetSourceCount: sources.length,
      successCount,
      errorCount,
      newListingCount,
      updatedListingCount,
      skippedCount,
      errorMessage: errors.length > 0 ? errors.join("\n") : null,
      items
    };
  }

  const updatedRun = await prisma.collectorRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      targetSourceCount: sources.length,
      successCount,
      errorCount,
      newListingCount,
      updatedListingCount,
      skippedCount,
      errorMessage: errors.length > 0 ? errors.join("\n").slice(0, 2000) : null
    }
  });

  return { ...updatedRun, items };
}

export async function dryRunUrl(input: {
  url: string;
  type?: string;
  sourceName?: string;
  storeName?: string;
}) {
  const source: SourceLike = {
    id: "dry-run",
    name: input.sourceName || "テストURL",
    storeName: input.storeName || "テスト店舗",
    url: input.url,
    type: input.type || "html",
    enabled: true
  };
  return collectSource(source);
}
