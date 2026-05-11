-- CreateTable
CREATE TABLE "WatchSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'html',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" DATETIME,
    "lastError" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LotteryListing" (
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
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectorRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "newListingCount" INTEGER NOT NULL DEFAULT 0,
    "updatedListingCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchSource_url_key" ON "WatchSource"("url");

-- CreateIndex
CREATE INDEX "WatchSource_enabled_idx" ON "WatchSource"("enabled");

-- CreateIndex
CREATE INDEX "WatchSource_type_idx" ON "WatchSource"("type");

-- CreateIndex
CREATE INDEX "WatchSource_storeName_idx" ON "WatchSource"("storeName");

-- CreateIndex
CREATE UNIQUE INDEX "LotteryListing_lotteryUrl_key" ON "LotteryListing"("lotteryUrl");

-- CreateIndex
CREATE INDEX "LotteryListing_productName_idx" ON "LotteryListing"("productName");

-- CreateIndex
CREATE INDEX "LotteryListing_storeName_idx" ON "LotteryListing"("storeName");

-- CreateIndex
CREATE INDEX "LotteryListing_status_idx" ON "LotteryListing"("status");

-- CreateIndex
CREATE INDEX "LotteryListing_applicationEndAt_idx" ON "LotteryListing"("applicationEndAt");

-- CreateIndex
CREATE INDEX "LotteryListing_detectedAt_idx" ON "LotteryListing"("detectedAt");

-- CreateIndex
CREATE INDEX "LotteryListing_lastSeenAt_idx" ON "LotteryListing"("lastSeenAt");

-- CreateIndex
CREATE INDEX "CollectorRun_startedAt_idx" ON "CollectorRun"("startedAt");
