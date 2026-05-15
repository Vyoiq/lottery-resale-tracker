-- AlterTable
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiApplicationEndAt" DATETIME;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiApplicationStartAt" DATETIME;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiCategory" TEXT;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiClassifiedAt" DATETIME;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiConfidenceScore" REAL;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiExcludeReason" TEXT;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiIsCurrentlyOpen" BOOLEAN;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiIsJustArticle" BOOLEAN;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiIsLotteryApplicationPage" BOOLEAN;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiIsPastOrEnded" BOOLEAN;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiIsPriceBuybackPage" BOOLEAN;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiIsProductSalesPage" BOOLEAN;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiModel" TEXT;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiPurchaseDeadlineAt" DATETIME;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiReason" TEXT;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiResultAnnouncementAt" DATETIME;
ALTER TABLE "DiscoveredSource" ADD COLUMN "rawText" TEXT;

-- AlterTable
ALTER TABLE "LotteryListing" ADD COLUMN "aiApplicationEndAt" DATETIME;
ALTER TABLE "LotteryListing" ADD COLUMN "aiApplicationStartAt" DATETIME;
ALTER TABLE "LotteryListing" ADD COLUMN "aiCategory" TEXT;
ALTER TABLE "LotteryListing" ADD COLUMN "aiClassifiedAt" DATETIME;
ALTER TABLE "LotteryListing" ADD COLUMN "aiConfidenceScore" REAL;
ALTER TABLE "LotteryListing" ADD COLUMN "aiExcludeReason" TEXT;
ALTER TABLE "LotteryListing" ADD COLUMN "aiIsCurrentlyOpen" BOOLEAN;
ALTER TABLE "LotteryListing" ADD COLUMN "aiIsJustArticle" BOOLEAN;
ALTER TABLE "LotteryListing" ADD COLUMN "aiIsLotteryApplicationPage" BOOLEAN;
ALTER TABLE "LotteryListing" ADD COLUMN "aiIsPastOrEnded" BOOLEAN;
ALTER TABLE "LotteryListing" ADD COLUMN "aiIsPriceBuybackPage" BOOLEAN;
ALTER TABLE "LotteryListing" ADD COLUMN "aiIsProductSalesPage" BOOLEAN;
ALTER TABLE "LotteryListing" ADD COLUMN "aiModel" TEXT;
ALTER TABLE "LotteryListing" ADD COLUMN "aiPurchaseDeadlineAt" DATETIME;
ALTER TABLE "LotteryListing" ADD COLUMN "aiReason" TEXT;
ALTER TABLE "LotteryListing" ADD COLUMN "aiResultAnnouncementAt" DATETIME;

-- CreateIndex
CREATE INDEX "DiscoveredSource_aiIsLotteryApplicationPage_idx" ON "DiscoveredSource"("aiIsLotteryApplicationPage");

-- CreateIndex
CREATE INDEX "DiscoveredSource_aiIsCurrentlyOpen_idx" ON "DiscoveredSource"("aiIsCurrentlyOpen");

-- CreateIndex
CREATE INDEX "DiscoveredSource_aiConfidenceScore_idx" ON "DiscoveredSource"("aiConfidenceScore");

-- CreateIndex
CREATE INDEX "LotteryListing_aiIsLotteryApplicationPage_idx" ON "LotteryListing"("aiIsLotteryApplicationPage");

-- CreateIndex
CREATE INDEX "LotteryListing_aiIsCurrentlyOpen_idx" ON "LotteryListing"("aiIsCurrentlyOpen");

-- CreateIndex
CREATE INDEX "LotteryListing_aiConfidenceScore_idx" ON "LotteryListing"("aiConfidenceScore");
