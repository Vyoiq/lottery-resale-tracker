-- CreateTable
CREATE TABLE "PriceSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "searchUrlTemplate" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotteryListingId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "matchedTitle" TEXT NOT NULL,
    "confidenceScore" REAL NOT NULL DEFAULT 0,
    "extractedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceRecord_lotteryListingId_fkey" FOREIGN KEY ("lotteryListingId") REFERENCES "LotteryListing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceCollectorRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "newPriceCount" INTEGER NOT NULL DEFAULT 0,
    "updatedPriceCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LotteryListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "lotteryUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "description" TEXT,
    "applicationStartAt" DATETIME,
    "applicationEndAt" DATETIME,
    "resultAnnouncementAt" DATETIME,
    "purchaseDeadlineAt" DATETIME,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "confidenceScore" REAL NOT NULL DEFAULT 0,
    "matchedKeywords" TEXT,
    "confidenceReason" TEXT,
    "extractedDatesRaw" TEXT,
    "normalizedUrl" TEXT,
    "contentHash" TEXT,
    "retailPrice" INTEGER,
    "bestBuyPrice" INTEGER,
    "estimatedProfit" INTEGER,
    "profitRate" REAL,
    "roi" REAL,
    "priceMultiplier" REAL,
    "priceCheckedAt" DATETIME,
    "priceStatus" TEXT NOT NULL DEFAULT 'unchecked',
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LotteryListing" ("applicationEndAt", "applicationStartAt", "confidenceReason", "confidenceScore", "contentHash", "createdAt", "description", "detectedAt", "extractedDatesRaw", "id", "imageUrl", "lastSeenAt", "lotteryUrl", "matchedKeywords", "normalizedUrl", "productName", "purchaseDeadlineAt", "rawText", "resultAnnouncementAt", "sourceName", "sourceUrl", "status", "storeName", "title", "updatedAt") SELECT "applicationEndAt", "applicationStartAt", "confidenceReason", "confidenceScore", "contentHash", "createdAt", "description", "detectedAt", "extractedDatesRaw", "id", "imageUrl", "lastSeenAt", "lotteryUrl", "matchedKeywords", "normalizedUrl", "productName", "purchaseDeadlineAt", "rawText", "resultAnnouncementAt", "sourceName", "sourceUrl", "status", "storeName", "title", "updatedAt" FROM "LotteryListing";
DROP TABLE "LotteryListing";
ALTER TABLE "new_LotteryListing" RENAME TO "LotteryListing";
CREATE UNIQUE INDEX "LotteryListing_lotteryUrl_key" ON "LotteryListing"("lotteryUrl");
CREATE INDEX "LotteryListing_productName_idx" ON "LotteryListing"("productName");
CREATE INDEX "LotteryListing_storeName_idx" ON "LotteryListing"("storeName");
CREATE INDEX "LotteryListing_status_idx" ON "LotteryListing"("status");
CREATE INDEX "LotteryListing_applicationEndAt_idx" ON "LotteryListing"("applicationEndAt");
CREATE INDEX "LotteryListing_detectedAt_idx" ON "LotteryListing"("detectedAt");
CREATE INDEX "LotteryListing_lastSeenAt_idx" ON "LotteryListing"("lastSeenAt");
CREATE INDEX "LotteryListing_contentHash_idx" ON "LotteryListing"("contentHash");
CREATE INDEX "LotteryListing_priceStatus_idx" ON "LotteryListing"("priceStatus");
CREATE INDEX "LotteryListing_estimatedProfit_idx" ON "LotteryListing"("estimatedProfit");
CREATE INDEX "LotteryListing_roi_idx" ON "LotteryListing"("roi");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PriceSource_enabled_idx" ON "PriceSource"("enabled");

-- CreateIndex
CREATE INDEX "PriceSource_shopName_idx" ON "PriceSource"("shopName");

-- CreateIndex
CREATE INDEX "PriceRecord_lotteryListingId_idx" ON "PriceRecord"("lotteryListingId");

-- CreateIndex
CREATE INDEX "PriceRecord_shopName_idx" ON "PriceRecord"("shopName");

-- CreateIndex
CREATE INDEX "PriceRecord_price_idx" ON "PriceRecord"("price");

-- CreateIndex
CREATE INDEX "PriceRecord_extractedAt_idx" ON "PriceRecord"("extractedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceRecord_lotteryListingId_sourceUrl_matchedTitle_key" ON "PriceRecord"("lotteryListingId", "sourceUrl", "matchedTitle");

-- CreateIndex
CREATE INDEX "PriceCollectorRun_startedAt_idx" ON "PriceCollectorRun"("startedAt");
