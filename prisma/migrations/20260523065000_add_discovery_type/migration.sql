-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DiscoveredSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discoveryQueryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "description" TEXT,
    "detectedType" TEXT NOT NULL DEFAULT 'unknown',
    "discoveryType" TEXT NOT NULL DEFAULT 'unknown',
    "category" TEXT NOT NULL DEFAULT 'other',
    "confidenceScore" REAL NOT NULL DEFAULT 0,
    "matchedKeywords" TEXT,
    "reason" TEXT,
    "providerName" TEXT,
    "searchUrlTemplateCandidate" TEXT,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "rawText" TEXT,
    "aiClassifiedAt" DATETIME,
    "aiModel" TEXT,
    "aiIsLotteryApplicationPage" BOOLEAN,
    "aiIsCurrentlyOpen" BOOLEAN,
    "aiIsPastOrEnded" BOOLEAN,
    "aiIsJustArticle" BOOLEAN,
    "aiIsProductSalesPage" BOOLEAN,
    "aiIsPriceBuybackPage" BOOLEAN,
    "aiCategory" TEXT,
    "aiConfidenceScore" REAL,
    "aiApplicationStartAt" DATETIME,
    "aiApplicationEndAt" DATETIME,
    "aiResultAnnouncementAt" DATETIME,
    "aiPurchaseDeadlineAt" DATETIME,
    "articlePublishedAt" DATETIME,
    "aiReason" TEXT,
    "aiExcludeReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiscoveredSource_discoveryQueryId_fkey" FOREIGN KEY ("discoveryQueryId") REFERENCES "DiscoveryQuery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DiscoveredSource" ("aiApplicationEndAt", "aiApplicationStartAt", "aiCategory", "aiClassifiedAt", "aiConfidenceScore", "aiExcludeReason", "aiIsCurrentlyOpen", "aiIsJustArticle", "aiIsLotteryApplicationPage", "aiIsPastOrEnded", "aiIsPriceBuybackPage", "aiIsProductSalesPage", "aiModel", "aiPurchaseDeadlineAt", "aiReason", "aiResultAnnouncementAt", "category", "confidenceScore", "createdAt", "description", "detectedType", "discoveredAt", "discoveryQueryId", "id", "lastSeenAt", "matchedKeywords", "normalizedUrl", "providerName", "rawText", "reason", "requiresReview", "searchUrlTemplateCandidate", "status", "title", "updatedAt", "url") SELECT "aiApplicationEndAt", "aiApplicationStartAt", "aiCategory", "aiClassifiedAt", "aiConfidenceScore", "aiExcludeReason", "aiIsCurrentlyOpen", "aiIsJustArticle", "aiIsLotteryApplicationPage", "aiIsPastOrEnded", "aiIsPriceBuybackPage", "aiIsProductSalesPage", "aiModel", "aiPurchaseDeadlineAt", "aiReason", "aiResultAnnouncementAt", "category", "confidenceScore", "createdAt", "description", "detectedType", "discoveredAt", "discoveryQueryId", "id", "lastSeenAt", "matchedKeywords", "normalizedUrl", "providerName", "rawText", "reason", "requiresReview", "searchUrlTemplateCandidate", "status", "title", "updatedAt", "url" FROM "DiscoveredSource";
DROP TABLE "DiscoveredSource";
ALTER TABLE "new_DiscoveredSource" RENAME TO "DiscoveredSource";
CREATE UNIQUE INDEX "DiscoveredSource_normalizedUrl_key" ON "DiscoveredSource"("normalizedUrl");
CREATE INDEX "DiscoveredSource_discoveryQueryId_idx" ON "DiscoveredSource"("discoveryQueryId");
CREATE INDEX "DiscoveredSource_detectedType_idx" ON "DiscoveredSource"("detectedType");
CREATE INDEX "DiscoveredSource_discoveryType_idx" ON "DiscoveredSource"("discoveryType");
CREATE INDEX "DiscoveredSource_articlePublishedAt_idx" ON "DiscoveredSource"("articlePublishedAt");
CREATE INDEX "DiscoveredSource_category_idx" ON "DiscoveredSource"("category");
CREATE INDEX "DiscoveredSource_confidenceScore_idx" ON "DiscoveredSource"("confidenceScore");
CREATE INDEX "DiscoveredSource_aiIsLotteryApplicationPage_idx" ON "DiscoveredSource"("aiIsLotteryApplicationPage");
CREATE INDEX "DiscoveredSource_aiIsCurrentlyOpen_idx" ON "DiscoveredSource"("aiIsCurrentlyOpen");
CREATE INDEX "DiscoveredSource_aiConfidenceScore_idx" ON "DiscoveredSource"("aiConfidenceScore");
CREATE INDEX "DiscoveredSource_status_idx" ON "DiscoveredSource"("status");
CREATE INDEX "DiscoveredSource_discoveredAt_idx" ON "DiscoveredSource"("discoveredAt");
CREATE INDEX "DiscoveredSource_lastSeenAt_idx" ON "DiscoveredSource"("lastSeenAt");
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
    "discoveryType" TEXT NOT NULL DEFAULT 'unknown',
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
    "aiClassifiedAt" DATETIME,
    "aiModel" TEXT,
    "aiIsLotteryApplicationPage" BOOLEAN,
    "aiIsCurrentlyOpen" BOOLEAN,
    "aiIsPastOrEnded" BOOLEAN,
    "aiIsJustArticle" BOOLEAN,
    "aiIsProductSalesPage" BOOLEAN,
    "aiIsPriceBuybackPage" BOOLEAN,
    "aiCategory" TEXT,
    "aiConfidenceScore" REAL,
    "aiApplicationStartAt" DATETIME,
    "aiApplicationEndAt" DATETIME,
    "aiResultAnnouncementAt" DATETIME,
    "aiPurchaseDeadlineAt" DATETIME,
    "articlePublishedAt" DATETIME,
    "aiReason" TEXT,
    "aiExcludeReason" TEXT,
    "applicationPriorityScore" REAL NOT NULL DEFAULT 0,
    "applicationPriorityLabel" TEXT NOT NULL DEFAULT 'D',
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "ignoredReason" TEXT,
    "ignoredAt" DATETIME,
    "userVerdict" TEXT,
    "userVerdictMemo" TEXT,
    "userVerdictAt" DATETIME,
    "applicationStatus" TEXT NOT NULL DEFAULT 'not_applied',
    "appliedAt" DATETIME,
    "wonAt" DATETIME,
    "lostAt" DATETIME,
    "purchasedAt" DATETIME,
    "soldAt" DATETIME,
    "skippedAt" DATETIME,
    "purchasePrice" INTEGER,
    "purchaseMemo" TEXT,
    "salePrice" INTEGER,
    "shippingCost" INTEGER,
    "fee" INTEGER,
    "actualProfit" INTEGER,
    "actualProfitRate" REAL,
    "actualRoi" REAL,
    "saleDestination" TEXT,
    "saleMemo" TEXT,
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LotteryListing" ("actualProfit", "actualProfitRate", "actualRoi", "aiApplicationEndAt", "aiApplicationStartAt", "aiCategory", "aiClassifiedAt", "aiConfidenceScore", "aiExcludeReason", "aiIsCurrentlyOpen", "aiIsJustArticle", "aiIsLotteryApplicationPage", "aiIsPastOrEnded", "aiIsPriceBuybackPage", "aiIsProductSalesPage", "aiModel", "aiPurchaseDeadlineAt", "aiReason", "aiResultAnnouncementAt", "applicationEndAt", "applicationPriorityLabel", "applicationPriorityScore", "applicationStartAt", "applicationStatus", "appliedAt", "bestBuyPrice", "confidenceReason", "confidenceScore", "contentHash", "createdAt", "description", "detectedAt", "estimatedProfit", "extractedDatesRaw", "fee", "id", "ignored", "ignoredAt", "ignoredReason", "imageUrl", "lastSeenAt", "lostAt", "lotteryUrl", "matchedKeywords", "normalizedUrl", "priceCheckedAt", "priceMultiplier", "priceStatus", "productName", "profitRate", "purchaseDeadlineAt", "purchaseMemo", "purchasePrice", "purchasedAt", "rawText", "resultAnnouncementAt", "retailPrice", "roi", "saleDestination", "saleMemo", "salePrice", "shippingCost", "skippedAt", "soldAt", "sourceName", "sourceUrl", "status", "storeName", "title", "updatedAt", "userVerdict", "userVerdictAt", "userVerdictMemo", "wonAt") SELECT "actualProfit", "actualProfitRate", "actualRoi", "aiApplicationEndAt", "aiApplicationStartAt", "aiCategory", "aiClassifiedAt", "aiConfidenceScore", "aiExcludeReason", "aiIsCurrentlyOpen", "aiIsJustArticle", "aiIsLotteryApplicationPage", "aiIsPastOrEnded", "aiIsPriceBuybackPage", "aiIsProductSalesPage", "aiModel", "aiPurchaseDeadlineAt", "aiReason", "aiResultAnnouncementAt", "applicationEndAt", "applicationPriorityLabel", "applicationPriorityScore", "applicationStartAt", "applicationStatus", "appliedAt", "bestBuyPrice", "confidenceReason", "confidenceScore", "contentHash", "createdAt", "description", "detectedAt", "estimatedProfit", "extractedDatesRaw", "fee", "id", "ignored", "ignoredAt", "ignoredReason", "imageUrl", "lastSeenAt", "lostAt", "lotteryUrl", "matchedKeywords", "normalizedUrl", "priceCheckedAt", "priceMultiplier", "priceStatus", "productName", "profitRate", "purchaseDeadlineAt", "purchaseMemo", "purchasePrice", "purchasedAt", "rawText", "resultAnnouncementAt", "retailPrice", "roi", "saleDestination", "saleMemo", "salePrice", "shippingCost", "skippedAt", "soldAt", "sourceName", "sourceUrl", "status", "storeName", "title", "updatedAt", "userVerdict", "userVerdictAt", "userVerdictMemo", "wonAt" FROM "LotteryListing";
DROP TABLE "LotteryListing";
ALTER TABLE "new_LotteryListing" RENAME TO "LotteryListing";
CREATE UNIQUE INDEX "LotteryListing_lotteryUrl_key" ON "LotteryListing"("lotteryUrl");
CREATE INDEX "LotteryListing_productName_idx" ON "LotteryListing"("productName");
CREATE INDEX "LotteryListing_storeName_idx" ON "LotteryListing"("storeName");
CREATE INDEX "LotteryListing_status_idx" ON "LotteryListing"("status");
CREATE INDEX "LotteryListing_discoveryType_idx" ON "LotteryListing"("discoveryType");
CREATE INDEX "LotteryListing_applicationEndAt_idx" ON "LotteryListing"("applicationEndAt");
CREATE INDEX "LotteryListing_articlePublishedAt_idx" ON "LotteryListing"("articlePublishedAt");
CREATE INDEX "LotteryListing_detectedAt_idx" ON "LotteryListing"("detectedAt");
CREATE INDEX "LotteryListing_lastSeenAt_idx" ON "LotteryListing"("lastSeenAt");
CREATE INDEX "LotteryListing_contentHash_idx" ON "LotteryListing"("contentHash");
CREATE INDEX "LotteryListing_priceStatus_idx" ON "LotteryListing"("priceStatus");
CREATE INDEX "LotteryListing_aiIsLotteryApplicationPage_idx" ON "LotteryListing"("aiIsLotteryApplicationPage");
CREATE INDEX "LotteryListing_aiIsCurrentlyOpen_idx" ON "LotteryListing"("aiIsCurrentlyOpen");
CREATE INDEX "LotteryListing_aiConfidenceScore_idx" ON "LotteryListing"("aiConfidenceScore");
CREATE INDEX "LotteryListing_estimatedProfit_idx" ON "LotteryListing"("estimatedProfit");
CREATE INDEX "LotteryListing_roi_idx" ON "LotteryListing"("roi");
CREATE INDEX "LotteryListing_applicationPriorityScore_idx" ON "LotteryListing"("applicationPriorityScore");
CREATE INDEX "LotteryListing_applicationPriorityLabel_idx" ON "LotteryListing"("applicationPriorityLabel");
CREATE INDEX "LotteryListing_ignored_idx" ON "LotteryListing"("ignored");
CREATE INDEX "LotteryListing_userVerdict_idx" ON "LotteryListing"("userVerdict");
CREATE INDEX "LotteryListing_applicationStatus_idx" ON "LotteryListing"("applicationStatus");
CREATE INDEX "LotteryListing_soldAt_idx" ON "LotteryListing"("soldAt");
CREATE INDEX "LotteryListing_actualProfit_idx" ON "LotteryListing"("actualProfit");
CREATE INDEX "LotteryListing_actualRoi_idx" ON "LotteryListing"("actualRoi");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
