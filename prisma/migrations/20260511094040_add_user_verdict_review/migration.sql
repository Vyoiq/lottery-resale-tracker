-- AlterTable
ALTER TABLE "LotteryListing" ADD COLUMN "userVerdict" TEXT;
ALTER TABLE "LotteryListing" ADD COLUMN "userVerdictAt" DATETIME;
ALTER TABLE "LotteryListing" ADD COLUMN "userVerdictMemo" TEXT;

-- CreateIndex
CREATE INDEX "LotteryListing_userVerdict_idx" ON "LotteryListing"("userVerdict");
