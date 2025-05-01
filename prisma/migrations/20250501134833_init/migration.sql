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
    "languageCode" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "parentRegion" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT '',
    "defaultFormalityLevel" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Region_parentRegion_fkey" FOREIGN KEY ("parentRegion") REFERENCES "Region" ("languageCode") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CulturalData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionId" TEXT NOT NULL,
    "formalityLevel" INTEGER,
    "style" TEXT NOT NULL DEFAULT '',
    "considerations" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CulturalData_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("languageCode") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prompt" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL DEFAULT '',
    "tactic" TEXT,
    "activeVersionId" TEXT,
    "project" TEXT,
    CONSTRAINT "Prompt_tactic_fkey" FOREIGN KEY ("tactic") REFERENCES "Tactic" ("name") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Prompt_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "PromptVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Prompt_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "promptText" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
    "changeMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptVersion_prompt_fkey" FOREIGN KEY ("prompt") REFERENCES "Prompt" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tactic" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT,
    "culturalDataId" TEXT,
    "tacticsConfig" TEXT,
    "projectId" TEXT,
    CONSTRAINT "Tactic_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("languageCode") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tactic_culturalDataId_fkey" FOREIGN KEY ("culturalDataId") REFERENCES "CulturalData" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tactic_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "promptText" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "PromptTranslation_version_fkey" FOREIGN KEY ("version") REFERENCES "PromptVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptAsset" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "type" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "activeVersionId" TEXT,
    "project" TEXT,
    CONSTRAINT "PromptAsset_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "PromptAssetVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptAsset_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptAssetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asset" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
    "changeMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptAssetVersion_asset_fkey" FOREIGN KEY ("asset") REFERENCES "PromptAsset" ("key") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "AssetTranslation_version_fkey" FOREIGN KEY ("version") REFERENCES "PromptAssetVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptAssetLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptVersion" TEXT NOT NULL,
    "assetVersion" TEXT NOT NULL,
    "usageContext" TEXT NOT NULL DEFAULT '',
    "position" INTEGER,
    "insertionLogic" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PromptAssetLink_promptVersion_fkey" FOREIGN KEY ("promptVersion") REFERENCES "PromptVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PromptAssetLink_assetVersion_fkey" FOREIGN KEY ("assetVersion") REFERENCES "PromptAssetVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    CONSTRAINT "RagDocumentMetadata_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("languageCode") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerUser" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_ownerUser_fkey" FOREIGN KEY ("ownerUser") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "description" TEXT,
    "apiIdentifier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxTokens" INTEGER,
    "supportsJson" BOOLEAN NOT NULL DEFAULT false,
    "contextWindow" INTEGER
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "_PromptTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PromptTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Prompt" ("name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PromptTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ProjectModels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProjectModels_A_fkey" FOREIGN KEY ("A") REFERENCES "AIModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProjectModels_B_fkey" FOREIGN KEY ("B") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Region_parentRegion_idx" ON "Region"("parentRegion");

-- CreateIndex
CREATE INDEX "CulturalData_regionId_idx" ON "CulturalData"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_activeVersionId_key" ON "Prompt"("activeVersionId");

-- CreateIndex
CREATE INDEX "Prompt_tactic_idx" ON "Prompt"("tactic");

-- CreateIndex
CREATE INDEX "Prompt_project_idx" ON "Prompt"("project");

-- CreateIndex
CREATE INDEX "PromptVersion_prompt_idx" ON "PromptVersion"("prompt");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_prompt_versionTag_key" ON "PromptVersion"("prompt", "versionTag");

-- CreateIndex
CREATE INDEX "Tactic_region_idx" ON "Tactic"("region");

-- CreateIndex
CREATE INDEX "Tactic_culturalDataId_idx" ON "Tactic"("culturalDataId");

-- CreateIndex
CREATE INDEX "Tactic_projectId_idx" ON "Tactic"("projectId");

-- CreateIndex
CREATE INDEX "PromptTranslation_version_idx" ON "PromptTranslation"("version");

-- CreateIndex
CREATE INDEX "PromptTranslation_languageCode_idx" ON "PromptTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTranslation_version_languageCode_key" ON "PromptTranslation"("version", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "PromptAsset_activeVersionId_key" ON "PromptAsset"("activeVersionId");

-- CreateIndex
CREATE INDEX "PromptAsset_project_idx" ON "PromptAsset"("project");

-- CreateIndex
CREATE INDEX "PromptAssetVersion_asset_idx" ON "PromptAssetVersion"("asset");

-- CreateIndex
CREATE UNIQUE INDEX "PromptAssetVersion_asset_versionTag_key" ON "PromptAssetVersion"("asset", "versionTag");

-- CreateIndex
CREATE INDEX "AssetTranslation_version_idx" ON "AssetTranslation"("version");

-- CreateIndex
CREATE INDEX "AssetTranslation_languageCode_idx" ON "AssetTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "AssetTranslation_version_languageCode_key" ON "AssetTranslation"("version", "languageCode");

-- CreateIndex
CREATE INDEX "PromptAssetLink_promptVersion_idx" ON "PromptAssetLink"("promptVersion");

-- CreateIndex
CREATE INDEX "PromptAssetLink_assetVersion_idx" ON "PromptAssetLink"("assetVersion");

-- CreateIndex
CREATE INDEX "RagDocumentMetadata_region_idx" ON "RagDocumentMetadata"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Project_ownerUser_idx" ON "Project"("ownerUser");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_name_key" ON "AIModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_name_key" ON "Environment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_PromptTags_AB_unique" ON "_PromptTags"("A", "B");

-- CreateIndex
CREATE INDEX "_PromptTags_B_index" ON "_PromptTags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProjectModels_AB_unique" ON "_ProjectModels"("A", "B");

-- CreateIndex
CREATE INDEX "_ProjectModels_B_index" ON "_ProjectModels"("B");
