-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromptAssetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asset" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT '1.0.0',
    "changeMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "marketplaceStatus" TEXT NOT NULL DEFAULT 'NOT_PUBLISHED',
    "marketplacePublishedAt" DATETIME,
    "marketplaceRequestedAt" DATETIME,
    "marketplaceApprovedAt" DATETIME,
    "marketplaceRejectionReason" TEXT,
    "marketplaceRequesterId" TEXT,
    "marketplaceApproverId" TEXT,
    CONSTRAINT "PromptAssetVersion_asset_fkey" FOREIGN KEY ("asset") REFERENCES "PromptAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromptAssetVersion_marketplaceRequesterId_fkey" FOREIGN KEY ("marketplaceRequesterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptAssetVersion_marketplaceApproverId_fkey" FOREIGN KEY ("marketplaceApproverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PromptAssetVersion" ("asset", "changeMessage", "createdAt", "id", "marketplaceApprovedAt", "marketplaceApproverId", "marketplacePublishedAt", "marketplaceRejectionReason", "marketplaceRequestedAt", "marketplaceRequesterId", "marketplaceStatus", "status", "updatedAt", "value", "versionTag") SELECT "asset", "changeMessage", "createdAt", "id", "marketplaceApprovedAt", "marketplaceApproverId", "marketplacePublishedAt", "marketplaceRejectionReason", "marketplaceRequestedAt", "marketplaceRequesterId", "marketplaceStatus", "status", "updatedAt", "value", "versionTag" FROM "PromptAssetVersion";
DROP TABLE "PromptAssetVersion";
ALTER TABLE "new_PromptAssetVersion" RENAME TO "PromptAssetVersion";
CREATE INDEX "PromptAssetVersion_asset_idx" ON "PromptAssetVersion"("asset");
CREATE INDEX "PromptAssetVersion_marketplaceRequesterId_idx" ON "PromptAssetVersion"("marketplaceRequesterId");
CREATE INDEX "PromptAssetVersion_marketplaceApproverId_idx" ON "PromptAssetVersion"("marketplaceApproverId");
CREATE UNIQUE INDEX "PromptAssetVersion_asset_versionTag_key" ON "PromptAssetVersion"("asset", "versionTag");
CREATE TABLE "new_PromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "promptText" TEXT NOT NULL DEFAULT '',
    "languageCode" TEXT NOT NULL DEFAULT 'en-US',
    "versionTag" TEXT NOT NULL DEFAULT '1.0.0',
    "changeMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "aiModelId" TEXT,
    "marketplaceStatus" TEXT NOT NULL DEFAULT 'NOT_PUBLISHED',
    "marketplacePublishedAt" DATETIME,
    "marketplaceRequestedAt" DATETIME,
    "marketplaceApprovedAt" DATETIME,
    "marketplaceRejectionReason" TEXT,
    "marketplaceRequesterId" TEXT,
    "marketplaceApproverId" TEXT,
    CONSTRAINT "PromptVersion_prompt_fkey" FOREIGN KEY ("prompt") REFERENCES "prompts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromptVersion_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "AIModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptVersion_marketplaceRequesterId_fkey" FOREIGN KEY ("marketplaceRequesterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptVersion_marketplaceApproverId_fkey" FOREIGN KEY ("marketplaceApproverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PromptVersion" ("aiModelId", "changeMessage", "createdAt", "id", "languageCode", "marketplaceApprovedAt", "marketplaceApproverId", "marketplacePublishedAt", "marketplaceRejectionReason", "marketplaceRequestedAt", "marketplaceRequesterId", "marketplaceStatus", "prompt", "promptText", "status", "updatedAt", "versionTag") SELECT "aiModelId", "changeMessage", "createdAt", "id", "languageCode", "marketplaceApprovedAt", "marketplaceApproverId", "marketplacePublishedAt", "marketplaceRejectionReason", "marketplaceRequestedAt", "marketplaceRequesterId", "marketplaceStatus", "prompt", "promptText", "status", "updatedAt", "versionTag" FROM "PromptVersion";
DROP TABLE "PromptVersion";
ALTER TABLE "new_PromptVersion" RENAME TO "PromptVersion";
CREATE INDEX "PromptVersion_prompt_idx" ON "PromptVersion"("prompt");
CREATE INDEX "PromptVersion_aiModelId_idx" ON "PromptVersion"("aiModelId");
CREATE INDEX "PromptVersion_marketplaceRequesterId_idx" ON "PromptVersion"("marketplaceRequesterId");
CREATE INDEX "PromptVersion_marketplaceApproverId_idx" ON "PromptVersion"("marketplaceApproverId");
CREATE UNIQUE INDEX "PromptVersion_prompt_versionTag_key" ON "PromptVersion"("prompt", "versionTag");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
