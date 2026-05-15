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
    "category" TEXT NOT NULL DEFAULT 'other',
    "confidenceScore" REAL NOT NULL DEFAULT 0,
    "matchedKeywords" TEXT,
    "reason" TEXT,
    "providerName" TEXT,
    "searchUrlTemplateCandidate" TEXT,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'new',
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiscoveredSource_discoveryQueryId_fkey" FOREIGN KEY ("discoveryQueryId") REFERENCES "DiscoveryQuery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DiscoveredSource" ("category", "confidenceScore", "createdAt", "description", "detectedType", "discoveredAt", "discoveryQueryId", "id", "lastSeenAt", "matchedKeywords", "normalizedUrl", "reason", "status", "title", "updatedAt", "url") SELECT "category", "confidenceScore", "createdAt", "description", "detectedType", "discoveredAt", "discoveryQueryId", "id", "lastSeenAt", "matchedKeywords", "normalizedUrl", "reason", "status", "title", "updatedAt", "url" FROM "DiscoveredSource";
DROP TABLE "DiscoveredSource";
ALTER TABLE "new_DiscoveredSource" RENAME TO "DiscoveredSource";
CREATE UNIQUE INDEX "DiscoveredSource_normalizedUrl_key" ON "DiscoveredSource"("normalizedUrl");
CREATE INDEX "DiscoveredSource_discoveryQueryId_idx" ON "DiscoveredSource"("discoveryQueryId");
CREATE INDEX "DiscoveredSource_detectedType_idx" ON "DiscoveredSource"("detectedType");
CREATE INDEX "DiscoveredSource_category_idx" ON "DiscoveredSource"("category");
CREATE INDEX "DiscoveredSource_confidenceScore_idx" ON "DiscoveredSource"("confidenceScore");
CREATE INDEX "DiscoveredSource_status_idx" ON "DiscoveredSource"("status");
CREATE INDEX "DiscoveredSource_discoveredAt_idx" ON "DiscoveredSource"("discoveredAt");
CREATE INDEX "DiscoveredSource_lastSeenAt_idx" ON "DiscoveredSource"("lastSeenAt");
CREATE TABLE "new_PriceSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "searchUrlTemplate" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "lastCheckedAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "lastHttpStatus" INTEGER,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PriceSource" ("baseUrl", "createdAt", "enabled", "id", "lastCheckedAt", "memo", "name", "searchUrlTemplate", "shopName", "updatedAt") SELECT "baseUrl", "createdAt", "enabled", "id", "lastCheckedAt", "memo", "name", "searchUrlTemplate", "shopName", "updatedAt" FROM "PriceSource";
DROP TABLE "PriceSource";
ALTER TABLE "new_PriceSource" RENAME TO "PriceSource";
CREATE INDEX "PriceSource_enabled_idx" ON "PriceSource"("enabled");
CREATE INDEX "PriceSource_shopName_idx" ON "PriceSource"("shopName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
