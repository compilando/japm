/*
  Warnings:

  - You are about to drop the column `ownerUser` on the `Project` table. All the data in the column will be lost.
  - Added the required column `ownerUserId` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("createdAt", "description", "id", "name", "tenantId", "updatedAt") SELECT "createdAt", "description", "id", "name", "tenantId", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");
CREATE INDEX "Project_ownerUserId_idx" ON "Project"("ownerUserId");
CREATE UNIQUE INDEX "Project_tenantId_name_key" ON "Project"("tenantId", "name");
CREATE TABLE "new_PromptAssetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asset" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
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
INSERT INTO "new_PromptAssetVersion" ("asset", "changeMessage", "createdAt", "id", "status", "updatedAt", "value", "versionTag") SELECT "asset", "changeMessage", "createdAt", "id", "status", "updatedAt", "value", "versionTag" FROM "PromptAssetVersion";
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
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
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
    CONSTRAINT "PromptVersion_prompt_fkey" FOREIGN KEY ("prompt") REFERENCES "Prompt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PromptVersion_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "AIModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptVersion_marketplaceRequesterId_fkey" FOREIGN KEY ("marketplaceRequesterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptVersion_marketplaceApproverId_fkey" FOREIGN KEY ("marketplaceApproverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PromptVersion" ("aiModelId", "changeMessage", "createdAt", "id", "prompt", "promptText", "status", "updatedAt", "versionTag") SELECT "aiModelId", "changeMessage", "createdAt", "id", "prompt", "promptText", "status", "updatedAt", "versionTag" FROM "PromptVersion";
DROP TABLE "PromptVersion";
ALTER TABLE "new_PromptVersion" RENAME TO "PromptVersion";
CREATE INDEX "PromptVersion_prompt_idx" ON "PromptVersion"("prompt");
CREATE INDEX "PromptVersion_aiModelId_idx" ON "PromptVersion"("aiModelId");
CREATE INDEX "PromptVersion_marketplaceRequesterId_idx" ON "PromptVersion"("marketplaceRequesterId");
CREATE INDEX "PromptVersion_marketplaceApproverId_idx" ON "PromptVersion"("marketplaceApproverId");
CREATE UNIQUE INDEX "PromptVersion_prompt_versionTag_key" ON "PromptVersion"("prompt", "versionTag");
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "marketplaceRequiresApproval" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Tenant" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
