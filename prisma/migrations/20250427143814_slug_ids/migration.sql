/*
  Warnings:

  - The primary key for the `ConversationPrompt` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ConversationPrompt` table. All the data in the column will be lost.
  - The primary key for the `ConversationPromptAsset` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ConversationPromptAsset` table. All the data in the column will be lost.
  - The primary key for the `ConversationTactic` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ConversationTactic` table. All the data in the column will be lost.
  - The primary key for the `CulturalData` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `CulturalData` table. All the data in the column will be lost.
  - The primary key for the `Region` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Region` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConversationPrompt" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL DEFAULT '',
    "tactic" TEXT,
    "activeVersionId" TEXT,
    CONSTRAINT "ConversationPrompt_tactic_fkey" FOREIGN KEY ("tactic") REFERENCES "ConversationTactic" ("name") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversationPrompt_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "ConversationPromptVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConversationPrompt" ("activeVersionId", "description", "name", "tactic") SELECT "activeVersionId", "description", "name", "tactic" FROM "ConversationPrompt";
DROP TABLE "ConversationPrompt";
ALTER TABLE "new_ConversationPrompt" RENAME TO "ConversationPrompt";
CREATE UNIQUE INDEX "ConversationPrompt_activeVersionId_key" ON "ConversationPrompt"("activeVersionId");
CREATE INDEX "ConversationPrompt_tactic_idx" ON "ConversationPrompt"("tactic");
CREATE TABLE "new_ConversationPromptAsset" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "type" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "activeVersionId" TEXT,
    CONSTRAINT "ConversationPromptAsset_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "ConversationPromptAssetVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConversationPromptAsset" ("activeVersionId", "category", "description", "key", "name", "type") SELECT "activeVersionId", "category", "description", "key", "name", "type" FROM "ConversationPromptAsset";
DROP TABLE "ConversationPromptAsset";
ALTER TABLE "new_ConversationPromptAsset" RENAME TO "ConversationPromptAsset";
CREATE UNIQUE INDEX "ConversationPromptAsset_activeVersionId_key" ON "ConversationPromptAsset"("activeVersionId");
CREATE TABLE "new_ConversationPromptAssetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asset" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
    "changeMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationPromptAssetVersion_asset_fkey" FOREIGN KEY ("asset") REFERENCES "ConversationPromptAsset" ("key") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ConversationPromptAssetVersion" ("asset", "changeMessage", "createdAt", "id", "value", "versionTag") SELECT "asset", "changeMessage", "createdAt", "id", "value", "versionTag" FROM "ConversationPromptAssetVersion";
DROP TABLE "ConversationPromptAssetVersion";
ALTER TABLE "new_ConversationPromptAssetVersion" RENAME TO "ConversationPromptAssetVersion";
CREATE INDEX "ConversationPromptAssetVersion_asset_idx" ON "ConversationPromptAssetVersion"("asset");
CREATE UNIQUE INDEX "ConversationPromptAssetVersion_asset_versionTag_key" ON "ConversationPromptAssetVersion"("asset", "versionTag");
CREATE TABLE "new_ConversationPromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "promptText" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
    "changeMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationPromptVersion_prompt_fkey" FOREIGN KEY ("prompt") REFERENCES "ConversationPrompt" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ConversationPromptVersion" ("changeMessage", "createdAt", "id", "prompt", "promptText", "versionTag") SELECT "changeMessage", "createdAt", "id", "prompt", "promptText", "versionTag" FROM "ConversationPromptVersion";
DROP TABLE "ConversationPromptVersion";
ALTER TABLE "new_ConversationPromptVersion" RENAME TO "ConversationPromptVersion";
CREATE INDEX "ConversationPromptVersion_prompt_idx" ON "ConversationPromptVersion"("prompt");
CREATE UNIQUE INDEX "ConversationPromptVersion_prompt_versionTag_key" ON "ConversationPromptVersion"("prompt", "versionTag");
CREATE TABLE "new_ConversationTactic" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT,
    "culturalData" TEXT,
    "tacticsConfig" TEXT,
    CONSTRAINT "ConversationTactic_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("languageCode") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversationTactic_culturalData_fkey" FOREIGN KEY ("culturalData") REFERENCES "CulturalData" ("region") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConversationTactic" ("culturalData", "name", "region", "tacticsConfig") SELECT "culturalData", "name", "region", "tacticsConfig" FROM "ConversationTactic";
DROP TABLE "ConversationTactic";
ALTER TABLE "new_ConversationTactic" RENAME TO "ConversationTactic";
CREATE INDEX "ConversationTactic_region_idx" ON "ConversationTactic"("region");
CREATE INDEX "ConversationTactic_culturalData_idx" ON "ConversationTactic"("culturalData");
CREATE TABLE "new_CulturalData" (
    "region" TEXT NOT NULL PRIMARY KEY,
    "formalityLevel" INTEGER,
    "style" TEXT NOT NULL DEFAULT '',
    "considerations" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CulturalData_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("languageCode") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CulturalData" ("considerations", "formalityLevel", "notes", "region", "style") SELECT "considerations", "formalityLevel", "notes", "region", "style" FROM "CulturalData";
DROP TABLE "CulturalData";
ALTER TABLE "new_CulturalData" RENAME TO "CulturalData";
CREATE TABLE "new_RagDocumentMetadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT,
    "documentName" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "complianceReviewed" BOOLEAN NOT NULL DEFAULT false,
    "piiRiskLevel" TEXT,
    "lastReviewedBy" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "RagDocumentMetadata_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("languageCode") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RagDocumentMetadata" ("category", "complianceReviewed", "documentName", "id", "lastReviewedBy", "piiRiskLevel", "region") SELECT "category", "complianceReviewed", "documentName", "id", "lastReviewedBy", "piiRiskLevel", "region" FROM "RagDocumentMetadata";
DROP TABLE "RagDocumentMetadata";
ALTER TABLE "new_RagDocumentMetadata" RENAME TO "RagDocumentMetadata";
CREATE INDEX "RagDocumentMetadata_region_idx" ON "RagDocumentMetadata"("region");
CREATE TABLE "new_Region" (
    "languageCode" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "parentRegion" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT '',
    "defaultFormalityLevel" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Region_parentRegion_fkey" FOREIGN KEY ("parentRegion") REFERENCES "Region" ("languageCode") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Region" ("defaultFormalityLevel", "languageCode", "name", "notes", "parentRegion", "timeZone") SELECT "defaultFormalityLevel", "languageCode", "name", "notes", "parentRegion", "timeZone" FROM "Region";
DROP TABLE "Region";
ALTER TABLE "new_Region" RENAME TO "Region";
CREATE INDEX "Region_parentRegion_idx" ON "Region"("parentRegion");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ConversationPromptAssetLink_promptVersion_idx" ON "ConversationPromptAssetLink"("promptVersion");

-- CreateIndex
CREATE INDEX "ConversationPromptAssetLink_assetVersion_idx" ON "ConversationPromptAssetLink"("assetVersion");
