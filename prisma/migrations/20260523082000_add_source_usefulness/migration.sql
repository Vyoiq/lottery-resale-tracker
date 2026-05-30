-- AlterTable
ALTER TABLE "DiscoveredSource" ADD COLUMN "sourceUsefulness" TEXT NOT NULL DEFAULT 'manual_review';
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiRecommendedAction" TEXT NOT NULL DEFAULT 'manual_review';
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiCanAutoRegister" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiCanAutoEnable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiTrustLevel" TEXT NOT NULL DEFAULT 'low';
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiSourceReason" TEXT;
ALTER TABLE "DiscoveredSource" ADD COLUMN "aiRiskReason" TEXT;

-- CreateIndex
CREATE INDEX "DiscoveredSource_sourceUsefulness_idx" ON "DiscoveredSource"("sourceUsefulness");
CREATE INDEX "DiscoveredSource_aiRecommendedAction_idx" ON "DiscoveredSource"("aiRecommendedAction");
CREATE INDEX "DiscoveredSource_aiTrustLevel_idx" ON "DiscoveredSource"("aiTrustLevel");
CREATE INDEX "DiscoveredSource_aiCanAutoRegister_idx" ON "DiscoveredSource"("aiCanAutoRegister");
CREATE INDEX "DiscoveredSource_aiCanAutoEnable_idx" ON "DiscoveredSource"("aiCanAutoEnable");
