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
    "project" TEXT NOT NULL,
    CONSTRAINT "Region_parentRegion_fkey" FOREIGN KEY ("parentRegion") REFERENCES "Region" ("languageCode") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Region_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CulturalData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionId" TEXT NOT NULL,
    "formalityLevel" INTEGER,
    "style" TEXT NOT NULL DEFAULT '',
    "considerations" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "project" TEXT NOT NULL,
    CONSTRAINT "CulturalData_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("languageCode") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CulturalData_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tactic" TEXT,
    "project" TEXT NOT NULL,
    CONSTRAINT "Prompt_tactic_fkey" FOREIGN KEY ("tactic") REFERENCES "Tactic" ("name") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Prompt_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "promptText" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
    "changeMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiModelId" TEXT,
    CONSTRAINT "PromptVersion_prompt_fkey" FOREIGN KEY ("prompt") REFERENCES "Prompt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PromptVersion_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "AIModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tactic" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT,
    "culturalDataId" TEXT,
    "tacticsConfig" TEXT,
    "project" TEXT NOT NULL,
    CONSTRAINT "Tactic_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("languageCode") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tactic_culturalDataId_fkey" FOREIGN KEY ("culturalDataId") REFERENCES "CulturalData" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tactic_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "project" TEXT NOT NULL,
    CONSTRAINT "PromptAsset_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptAssetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asset" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
    "changeMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
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
    "project" TEXT NOT NULL,
    CONSTRAINT "RagDocumentMetadata_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("languageCode") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RagDocumentMetadata_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "project" TEXT NOT NULL,
    CONSTRAINT "Tag_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "description" TEXT,
    "project" TEXT NOT NULL,
    CONSTRAINT "Environment_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptExecutionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promptVersionId" TEXT NOT NULL,
    "environmentId" TEXT,
    "userId" TEXT,
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "project" TEXT NOT NULL,
    CONSTRAINT "PromptExecutionLog_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PromptExecutionLog_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptExecutionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptExecutionLog_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PromptTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PromptTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Prompt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PromptTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ActivePromptsInEnvironment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ActivePromptsInEnvironment_A_fkey" FOREIGN KEY ("A") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ActivePromptsInEnvironment_B_fkey" FOREIGN KEY ("B") REFERENCES "PromptVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ActiveAssetsInEnvironment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ActiveAssetsInEnvironment_A_fkey" FOREIGN KEY ("A") REFERENCES "Environment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ActiveAssetsInEnvironment_B_fkey" FOREIGN KEY ("B") REFERENCES "PromptAssetVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Region_parentRegion_idx" ON "Region"("parentRegion");

-- CreateIndex
CREATE INDEX "Region_project_idx" ON "Region"("project");

-- CreateIndex
CREATE INDEX "CulturalData_regionId_idx" ON "CulturalData"("regionId");

-- CreateIndex
CREATE INDEX "CulturalData_project_idx" ON "CulturalData"("project");

-- CreateIndex
CREATE INDEX "Prompt_tactic_idx" ON "Prompt"("tactic");

-- CreateIndex
CREATE INDEX "Prompt_project_idx" ON "Prompt"("project");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_project_name_key" ON "Prompt"("project", "name");

-- CreateIndex
CREATE INDEX "PromptVersion_prompt_idx" ON "PromptVersion"("prompt");

-- CreateIndex
CREATE INDEX "PromptVersion_aiModelId_idx" ON "PromptVersion"("aiModelId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_prompt_versionTag_key" ON "PromptVersion"("prompt", "versionTag");

-- CreateIndex
CREATE INDEX "Tactic_region_idx" ON "Tactic"("region");

-- CreateIndex
CREATE INDEX "Tactic_culturalDataId_idx" ON "Tactic"("culturalDataId");

-- CreateIndex
CREATE INDEX "Tactic_project_idx" ON "Tactic"("project");

-- CreateIndex
CREATE INDEX "PromptTranslation_version_idx" ON "PromptTranslation"("version");

-- CreateIndex
CREATE INDEX "PromptTranslation_languageCode_idx" ON "PromptTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTranslation_version_languageCode_key" ON "PromptTranslation"("version", "languageCode");

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
CREATE UNIQUE INDEX "PromptAssetLink_promptVersion_assetVersion_key" ON "PromptAssetLink"("promptVersion", "assetVersion");

-- CreateIndex
CREATE INDEX "RagDocumentMetadata_region_idx" ON "RagDocumentMetadata"("region");

-- CreateIndex
CREATE INDEX "RagDocumentMetadata_project_idx" ON "RagDocumentMetadata"("project");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_project_idx" ON "Tag"("project");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_project_name_key" ON "Tag"("project", "name");

-- CreateIndex
CREATE INDEX "Project_ownerUser_idx" ON "Project"("ownerUser");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_name_key" ON "AIModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_name_key" ON "Environment"("name");

-- CreateIndex
CREATE INDEX "Environment_project_idx" ON "Environment"("project");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_project_name_key" ON "Environment"("project", "name");

-- CreateIndex
CREATE INDEX "PromptExecutionLog_promptVersionId_idx" ON "PromptExecutionLog"("promptVersionId");

-- CreateIndex
CREATE INDEX "PromptExecutionLog_environmentId_idx" ON "PromptExecutionLog"("environmentId");

-- CreateIndex
CREATE INDEX "PromptExecutionLog_userId_idx" ON "PromptExecutionLog"("userId");

-- CreateIndex
CREATE INDEX "PromptExecutionLog_timestamp_idx" ON "PromptExecutionLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "_PromptTags_AB_unique" ON "_PromptTags"("A", "B");

-- CreateIndex
CREATE INDEX "_PromptTags_B_index" ON "_PromptTags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ActivePromptsInEnvironment_AB_unique" ON "_ActivePromptsInEnvironment"("A", "B");

-- CreateIndex
CREATE INDEX "_ActivePromptsInEnvironment_B_index" ON "_ActivePromptsInEnvironment"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ActiveAssetsInEnvironment_AB_unique" ON "_ActiveAssetsInEnvironment"("A", "B");

-- CreateIndex
CREATE INDEX "_ActiveAssetsInEnvironment_B_index" ON "_ActiveAssetsInEnvironment"("B");
