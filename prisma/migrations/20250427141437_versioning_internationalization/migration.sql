/*
  Warnings:

  - You are about to drop the column `isActive` on the `ConversationPrompt` table. All the data in the column will be lost.
  - You are about to drop the column `promptText` on the `ConversationPrompt` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `ConversationPrompt` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `ConversationPrompt` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `ConversationPromptAsset` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `ConversationPromptAsset` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `ConversationPromptAsset` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `ConversationPromptAsset` table. All the data in the column will be lost.
  - You are about to drop the column `asset` on the `ConversationPromptAssetLink` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `ConversationPromptAssetLink` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `ConversationPromptAssetLink` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[languageCode]` on the table `Region` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assetVersion` to the `ConversationPromptAssetLink` table without a default value. This is not possible if the table is not empty.
  - Added the required column `promptVersion` to the `ConversationPromptAssetLink` table without a default value. This is not possible if the table is not empty.
  - Made the column `region` on table `CulturalData` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "ConversationPromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "promptText" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
    "changeMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationPromptVersion_prompt_fkey" FOREIGN KEY ("prompt") REFERENCES "ConversationPrompt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "promptText" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "PromptTranslation_version_fkey" FOREIGN KEY ("version") REFERENCES "ConversationPromptVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationPromptAssetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asset" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
    "changeMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationPromptAssetVersion_asset_fkey" FOREIGN KEY ("asset") REFERENCES "ConversationPromptAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "AssetTranslation_version_fkey" FOREIGN KEY ("version") REFERENCES "ConversationPromptAssetVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConversationPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "tactic" TEXT,
    "activeVersionId" TEXT,
    CONSTRAINT "ConversationPrompt_tactic_fkey" FOREIGN KEY ("tactic") REFERENCES "ConversationTactic" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversationPrompt_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "ConversationPromptVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConversationPrompt" ("description", "id", "name", "tactic") SELECT "description", "id", "name", "tactic" FROM "ConversationPrompt";
DROP TABLE "ConversationPrompt";
ALTER TABLE "new_ConversationPrompt" RENAME TO "ConversationPrompt";
CREATE UNIQUE INDEX "ConversationPrompt_name_key" ON "ConversationPrompt"("name");
CREATE UNIQUE INDEX "ConversationPrompt_activeVersionId_key" ON "ConversationPrompt"("activeVersionId");
CREATE INDEX "ConversationPrompt_tactic_idx" ON "ConversationPrompt"("tactic");
CREATE TABLE "new_ConversationPromptAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "type" TEXT,
    "key" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "activeVersionId" TEXT,
    CONSTRAINT "ConversationPromptAsset_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "ConversationPromptAssetVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConversationPromptAsset" ("category", "description", "id", "key", "name", "type") SELECT "category", "description", "id", "key", "name", "type" FROM "ConversationPromptAsset";
DROP TABLE "ConversationPromptAsset";
ALTER TABLE "new_ConversationPromptAsset" RENAME TO "ConversationPromptAsset";
CREATE UNIQUE INDEX "ConversationPromptAsset_key_key" ON "ConversationPromptAsset"("key");
CREATE UNIQUE INDEX "ConversationPromptAsset_activeVersionId_key" ON "ConversationPromptAsset"("activeVersionId");
CREATE TABLE "new_ConversationPromptAssetLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptVersion" TEXT NOT NULL,
    "assetVersion" TEXT NOT NULL,
    "usageContext" TEXT NOT NULL DEFAULT '',
    "position" INTEGER,
    CONSTRAINT "ConversationPromptAssetLink_promptVersion_fkey" FOREIGN KEY ("promptVersion") REFERENCES "ConversationPromptVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConversationPromptAssetLink_assetVersion_fkey" FOREIGN KEY ("assetVersion") REFERENCES "ConversationPromptAssetVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ConversationPromptAssetLink" ("id", "position", "usageContext") SELECT "id", "position", "usageContext" FROM "ConversationPromptAssetLink";
DROP TABLE "ConversationPromptAssetLink";
ALTER TABLE "new_ConversationPromptAssetLink" RENAME TO "ConversationPromptAssetLink";
CREATE TABLE "new_CulturalData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT NOT NULL,
    "formalityLevel" INTEGER,
    "style" TEXT NOT NULL DEFAULT '',
    "considerations" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CulturalData_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CulturalData" ("considerations", "formalityLevel", "id", "notes", "region", "style") SELECT "considerations", "formalityLevel", "id", "notes", "region", "style" FROM "CulturalData";
DROP TABLE "CulturalData";
ALTER TABLE "new_CulturalData" RENAME TO "CulturalData";
CREATE UNIQUE INDEX "CulturalData_region_key" ON "CulturalData"("region");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ConversationPromptVersion_prompt_idx" ON "ConversationPromptVersion"("prompt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationPromptVersion_prompt_versionTag_key" ON "ConversationPromptVersion"("prompt", "versionTag");

-- CreateIndex
CREATE INDEX "PromptTranslation_version_idx" ON "PromptTranslation"("version");

-- CreateIndex
CREATE INDEX "PromptTranslation_languageCode_idx" ON "PromptTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTranslation_version_languageCode_key" ON "PromptTranslation"("version", "languageCode");

-- CreateIndex
CREATE INDEX "ConversationPromptAssetVersion_asset_idx" ON "ConversationPromptAssetVersion"("asset");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationPromptAssetVersion_asset_versionTag_key" ON "ConversationPromptAssetVersion"("asset", "versionTag");

-- CreateIndex
CREATE INDEX "AssetTranslation_version_idx" ON "AssetTranslation"("version");

-- CreateIndex
CREATE INDEX "AssetTranslation_languageCode_idx" ON "AssetTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "AssetTranslation_version_languageCode_key" ON "AssetTranslation"("version", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "Region_languageCode_key" ON "Region"("languageCode");
