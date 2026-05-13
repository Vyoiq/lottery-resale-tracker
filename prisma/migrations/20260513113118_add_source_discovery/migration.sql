-- CreateTable
CREATE TABLE "DiscoveryQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'both',
    "category" TEXT NOT NULL DEFAULT 'other',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiscoveredSource" (
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
    "status" TEXT NOT NULL DEFAULT 'new',
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiscoveredSource_discoveryQueryId_fkey" FOREIGN KEY ("discoveryQueryId") REFERENCES "DiscoveryQuery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DiscoveryQuery_enabled_idx" ON "DiscoveryQuery"("enabled");

-- CreateIndex
CREATE INDEX "DiscoveryQuery_type_idx" ON "DiscoveryQuery"("type");

-- CreateIndex
CREATE INDEX "DiscoveryQuery_category_idx" ON "DiscoveryQuery"("category");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredSource_normalizedUrl_key" ON "DiscoveredSource"("normalizedUrl");

-- CreateIndex
CREATE INDEX "DiscoveredSource_discoveryQueryId_idx" ON "DiscoveredSource"("discoveryQueryId");

-- CreateIndex
CREATE INDEX "DiscoveredSource_detectedType_idx" ON "DiscoveredSource"("detectedType");

-- CreateIndex
CREATE INDEX "DiscoveredSource_category_idx" ON "DiscoveredSource"("category");

-- CreateIndex
CREATE INDEX "DiscoveredSource_confidenceScore_idx" ON "DiscoveredSource"("confidenceScore");

-- CreateIndex
CREATE INDEX "DiscoveredSource_status_idx" ON "DiscoveredSource"("status");

-- CreateIndex
CREATE INDEX "DiscoveredSource_discoveredAt_idx" ON "DiscoveredSource"("discoveredAt");

-- CreateIndex
CREATE INDEX "DiscoveredSource_lastSeenAt_idx" ON "DiscoveredSource"("lastSeenAt");
