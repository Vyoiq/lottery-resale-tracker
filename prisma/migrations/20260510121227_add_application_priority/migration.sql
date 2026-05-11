-- CreateTable
CREATE TABLE "ExclusionKeyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "applicationPriorityScore" REAL NOT NULL DEFAULT 0,
    "applicationPriorityLabel" TEXT NOT NULL DEFAULT 'D',
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "ignoredReason" TEXT,
    "ignoredAt" DATETIME,
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LotteryListing" ("applicationEndAt", "applicationStartAt", "bestBuyPrice", "confidenceReason", "confidenceScore", "contentHash", "createdAt", "description", "detectedAt", "estimatedProfit", "extractedDatesRaw", "id", "imageUrl", "lastSeenAt", "lotteryUrl", "matchedKeywords", "normalizedUrl", "priceCheckedAt", "priceMultiplier", "priceStatus", "productName", "profitRate", "purchaseDeadlineAt", "rawText", "resultAnnouncementAt", "retailPrice", "roi", "sourceName", "sourceUrl", "status", "storeName", "title", "updatedAt") SELECT "applicationEndAt", "applicationStartAt", "bestBuyPrice", "confidenceReason", "confidenceScore", "contentHash", "createdAt", "description", "detectedAt", "estimatedProfit", "extractedDatesRaw", "id", "imageUrl", "lastSeenAt", "lotteryUrl", "matchedKeywords", "normalizedUrl", "priceCheckedAt", "priceMultiplier", "priceStatus", "productName", "profitRate", "purchaseDeadlineAt", "rawText", "resultAnnouncementAt", "retailPrice", "roi", "sourceName", "sourceUrl", "status", "storeName", "title", "updatedAt" FROM "LotteryListing";
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
CREATE INDEX "LotteryListing_applicationPriorityScore_idx" ON "LotteryListing"("applicationPriorityScore");
CREATE INDEX "LotteryListing_applicationPriorityLabel_idx" ON "LotteryListing"("applicationPriorityLabel");
CREATE INDEX "LotteryListing_ignored_idx" ON "LotteryListing"("ignored");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ExclusionKeyword_keyword_key" ON "ExclusionKeyword"("keyword");

-- CreateIndex
CREATE INDEX "ExclusionKeyword_enabled_idx" ON "ExclusionKeyword"("enabled");
