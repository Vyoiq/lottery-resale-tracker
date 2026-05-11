-- AlterTable
ALTER TABLE "LotteryListing" ADD COLUMN "confidenceReason" TEXT;
ALTER TABLE "LotteryListing" ADD COLUMN "contentHash" TEXT;
ALTER TABLE "LotteryListing" ADD COLUMN "extractedDatesRaw" TEXT;
ALTER TABLE "LotteryListing" ADD COLUMN "matchedKeywords" TEXT;
ALTER TABLE "LotteryListing" ADD COLUMN "normalizedUrl" TEXT;

-- CreateTable
CREATE TABLE "CollectorRunItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectorRunId" TEXT NOT NULL,
    "watchSourceId" TEXT,
    "sourceName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "httpStatus" INTEGER,
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "matchedKeywords" TEXT,
    "newListingCount" INTEGER NOT NULL DEFAULT 0,
    "updatedListingCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectorRunItem_collectorRunId_fkey" FOREIGN KEY ("collectorRunId") REFERENCES "CollectorRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourcePreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'html',
    "category" TEXT NOT NULL,
    "description" TEXT,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CollectorRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "targetSourceCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "newListingCount" INTEGER NOT NULL DEFAULT 0,
    "updatedListingCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CollectorRun" ("createdAt", "errorCount", "errorMessage", "finishedAt", "id", "newListingCount", "startedAt", "successCount", "updatedListingCount") SELECT "createdAt", "errorCount", "errorMessage", "finishedAt", "id", "newListingCount", "startedAt", "successCount", "updatedListingCount" FROM "CollectorRun";
DROP TABLE "CollectorRun";
ALTER TABLE "new_CollectorRun" RENAME TO "CollectorRun";
CREATE INDEX "CollectorRun_startedAt_idx" ON "CollectorRun"("startedAt");
CREATE TABLE "new_WatchSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'html',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" DATETIME,
    "lastSuccess" BOOLEAN,
    "lastHttpStatus" INTEGER,
    "lastFetchedCount" INTEGER NOT NULL DEFAULT 0,
    "lastNewListingCount" INTEGER NOT NULL DEFAULT 0,
    "lastMatchedKeywords" TEXT,
    "lastError" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_WatchSource" ("createdAt", "enabled", "id", "lastCheckedAt", "lastError", "memo", "name", "storeName", "type", "updatedAt", "url") SELECT "createdAt", "enabled", "id", "lastCheckedAt", "lastError", "memo", "name", "storeName", "type", "updatedAt", "url" FROM "WatchSource";
DROP TABLE "WatchSource";
ALTER TABLE "new_WatchSource" RENAME TO "WatchSource";
CREATE UNIQUE INDEX "WatchSource_url_key" ON "WatchSource"("url");
CREATE INDEX "WatchSource_enabled_idx" ON "WatchSource"("enabled");
CREATE INDEX "WatchSource_type_idx" ON "WatchSource"("type");
CREATE INDEX "WatchSource_storeName_idx" ON "WatchSource"("storeName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CollectorRunItem_collectorRunId_idx" ON "CollectorRunItem"("collectorRunId");

-- CreateIndex
CREATE INDEX "CollectorRunItem_watchSourceId_idx" ON "CollectorRunItem"("watchSourceId");

-- CreateIndex
CREATE INDEX "CollectorRunItem_success_idx" ON "CollectorRunItem"("success");

-- CreateIndex
CREATE UNIQUE INDEX "SourcePreset_url_key" ON "SourcePreset"("url");

-- CreateIndex
CREATE INDEX "SourcePreset_category_idx" ON "SourcePreset"("category");

-- CreateIndex
CREATE INDEX "SourcePreset_storeName_idx" ON "SourcePreset"("storeName");

-- CreateIndex
CREATE INDEX "LotteryListing_contentHash_idx" ON "LotteryListing"("contentHash");
