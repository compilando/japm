-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "parentRegion" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT '',
    "languageCode" TEXT NOT NULL DEFAULT '',
    "defaultFormalityLevel" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Region_parentRegion_fkey" FOREIGN KEY ("parentRegion") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CulturalData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT,
    "formalityLevel" INTEGER,
    "style" TEXT NOT NULL DEFAULT '',
    "considerations" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CulturalData_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationTactic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "region" TEXT,
    "culturalData" TEXT,
    "tacticsConfig" TEXT,
    CONSTRAINT "ConversationTactic_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversationTactic_culturalData_fkey" FOREIGN KEY ("culturalData") REFERENCES "CulturalData" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "promptText" TEXT NOT NULL DEFAULT '',
    "region" TEXT,
    "version" TEXT NOT NULL DEFAULT '',
    "tactic" TEXT,
    CONSTRAINT "ConversationPrompt_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversationPrompt_tactic_fkey" FOREIGN KEY ("tactic") REFERENCES "ConversationTactic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationPromptAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "type" TEXT,
    "key" TEXT NOT NULL DEFAULT '',
    "value" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "region" TEXT,
    "version" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ConversationPromptAsset_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationPromptAssetLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT,
    "asset" TEXT,
    "usageContext" TEXT NOT NULL DEFAULT '',
    "position" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ConversationPromptAssetLink_prompt_fkey" FOREIGN KEY ("prompt") REFERENCES "ConversationPrompt" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversationPromptAssetLink_asset_fkey" FOREIGN KEY ("asset") REFERENCES "ConversationPromptAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RagDocumentMetadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT,
    "documentName" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "complianceReviewed" BOOLEAN NOT NULL DEFAULT false,
    "piiRiskLevel" TEXT,
    "lastReviewedBy" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "RagDocumentMetadata_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Region_parentRegion_idx" ON "Region"("parentRegion");

-- CreateIndex
CREATE UNIQUE INDEX "CulturalData_region_key" ON "CulturalData"("region");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationTactic_name_key" ON "ConversationTactic"("name");

-- CreateIndex
CREATE INDEX "ConversationTactic_region_idx" ON "ConversationTactic"("region");

-- CreateIndex
CREATE INDEX "ConversationTactic_culturalData_idx" ON "ConversationTactic"("culturalData");

-- CreateIndex
CREATE INDEX "ConversationPrompt_region_idx" ON "ConversationPrompt"("region");

-- CreateIndex
CREATE INDEX "ConversationPrompt_tactic_idx" ON "ConversationPrompt"("tactic");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationPromptAsset_key_key" ON "ConversationPromptAsset"("key");

-- CreateIndex
CREATE INDEX "ConversationPromptAsset_region_idx" ON "ConversationPromptAsset"("region");

-- CreateIndex
CREATE INDEX "ConversationPromptAssetLink_prompt_idx" ON "ConversationPromptAssetLink"("prompt");

-- CreateIndex
CREATE INDEX "ConversationPromptAssetLink_asset_idx" ON "ConversationPromptAssetLink"("asset");

-- CreateIndex
CREATE INDEX "RagDocumentMetadata_region_idx" ON "RagDocumentMetadata"("region");
