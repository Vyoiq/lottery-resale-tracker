-- CreateTable
CREATE TABLE "PriceSourcePreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "searchUrlTemplate" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SourcePreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'html',
    "category" TEXT NOT NULL,
    "description" TEXT,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "memo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SourcePreset" ("category", "createdAt", "defaultEnabled", "description", "id", "name", "storeName", "type", "updatedAt", "url") SELECT "category", "createdAt", "defaultEnabled", "description", "id", "name", "storeName", "type", "updatedAt", "url" FROM "SourcePreset";
DROP TABLE "SourcePreset";
ALTER TABLE "new_SourcePreset" RENAME TO "SourcePreset";
CREATE UNIQUE INDEX "SourcePreset_url_key" ON "SourcePreset"("url");
CREATE INDEX "SourcePreset_category_idx" ON "SourcePreset"("category");
CREATE INDEX "SourcePreset_recommended_idx" ON "SourcePreset"("recommended");
CREATE INDEX "SourcePreset_storeName_idx" ON "SourcePreset"("storeName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PriceSourcePreset_searchUrlTemplate_key" ON "PriceSourcePreset"("searchUrlTemplate");

-- CreateIndex
CREATE INDEX "PriceSourcePreset_category_idx" ON "PriceSourcePreset"("category");

-- CreateIndex
CREATE INDEX "PriceSourcePreset_recommended_idx" ON "PriceSourcePreset"("recommended");

-- CreateIndex
CREATE INDEX "PriceSourcePreset_shopName_idx" ON "PriceSourcePreset"("shopName");

-- CreateIndex
CREATE INDEX "PriceSourcePreset_baseUrl_idx" ON "PriceSourcePreset"("baseUrl");
