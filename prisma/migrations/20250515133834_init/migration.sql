-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "parentRegion" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT '',
    "defaultFormalityLevel" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "project" TEXT NOT NULL,
    CONSTRAINT "Region_parentRegion_fkey" FOREIGN KEY ("parentRegion") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Region_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CulturalData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "formalityLevel" INTEGER,
    "style" TEXT NOT NULL DEFAULT '',
    "considerations" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "project" TEXT NOT NULL,
    CONSTRAINT "CulturalData_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CulturalData_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "project" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "PromptTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "promptText" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptTranslation_version_fkey" FOREIGN KEY ("version") REFERENCES "PromptVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptAsset_promptId_projectId_fkey" FOREIGN KEY ("promptId", "projectId") REFERENCES "Prompt" ("id", "project") ON DELETE CASCADE ON UPDATE CASCADE
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

-- CreateTable
CREATE TABLE "AssetTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetTranslation_version_fkey" FOREIGN KEY ("version") REFERENCES "PromptAssetVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RagDocumentMetadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentName" TEXT NOT NULL,
    "category" TEXT DEFAULT '',
    "complianceReviewed" BOOLEAN DEFAULT false,
    "piiRiskLevel" TEXT DEFAULT '',
    "lastReviewedBy" TEXT DEFAULT '',
    "regionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "project" TEXT NOT NULL,
    CONSTRAINT "RagDocumentMetadata_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RagDocumentMetadata_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "project" TEXT NOT NULL,
    CONSTRAINT "Tag_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
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

-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "description" TEXT,
    "apiIdentifier" TEXT,
    "apiKeyEnvVar" TEXT,
    "temperature" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "maxTokens" INTEGER,
    "supportsJson" BOOLEAN NOT NULL DEFAULT false,
    "contextWindow" INTEGER,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "AIModel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
CREATE TABLE "SystemPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "promptText" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "marketplaceRequiresApproval" BOOLEAN NOT NULL DEFAULT true
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
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "Region_parentRegion_idx" ON "Region"("parentRegion");

-- CreateIndex
CREATE INDEX "Region_project_idx" ON "Region"("project");

-- CreateIndex
CREATE INDEX "Region_languageCode_idx" ON "Region"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "Region_project_languageCode_key" ON "Region"("project", "languageCode");

-- CreateIndex
CREATE INDEX "CulturalData_regionId_idx" ON "CulturalData"("regionId");

-- CreateIndex
CREATE INDEX "CulturalData_project_idx" ON "CulturalData"("project");

-- CreateIndex
CREATE INDEX "CulturalData_key_idx" ON "CulturalData"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CulturalData_project_key_key" ON "CulturalData"("project", "key");

-- CreateIndex
CREATE INDEX "Prompt_project_idx" ON "Prompt"("project");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_id_project_key" ON "Prompt"("id", "project");

-- CreateIndex
CREATE INDEX "PromptVersion_prompt_idx" ON "PromptVersion"("prompt");

-- CreateIndex
CREATE INDEX "PromptVersion_aiModelId_idx" ON "PromptVersion"("aiModelId");

-- CreateIndex
CREATE INDEX "PromptVersion_marketplaceRequesterId_idx" ON "PromptVersion"("marketplaceRequesterId");

-- CreateIndex
CREATE INDEX "PromptVersion_marketplaceApproverId_idx" ON "PromptVersion"("marketplaceApproverId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_prompt_versionTag_key" ON "PromptVersion"("prompt", "versionTag");

-- CreateIndex
CREATE INDEX "PromptTranslation_version_idx" ON "PromptTranslation"("version");

-- CreateIndex
CREATE INDEX "PromptTranslation_languageCode_idx" ON "PromptTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTranslation_version_languageCode_key" ON "PromptTranslation"("version", "languageCode");

-- CreateIndex
CREATE INDEX "PromptAsset_promptId_projectId_idx" ON "PromptAsset"("promptId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptAsset_promptId_projectId_key_key" ON "PromptAsset"("promptId", "projectId", "key");

-- CreateIndex
CREATE INDEX "PromptAssetVersion_asset_idx" ON "PromptAssetVersion"("asset");

-- CreateIndex
CREATE INDEX "PromptAssetVersion_marketplaceRequesterId_idx" ON "PromptAssetVersion"("marketplaceRequesterId");

-- CreateIndex
CREATE INDEX "PromptAssetVersion_marketplaceApproverId_idx" ON "PromptAssetVersion"("marketplaceApproverId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptAssetVersion_asset_versionTag_key" ON "PromptAssetVersion"("asset", "versionTag");

-- CreateIndex
CREATE INDEX "AssetTranslation_version_idx" ON "AssetTranslation"("version");

-- CreateIndex
CREATE INDEX "AssetTranslation_languageCode_idx" ON "AssetTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "AssetTranslation_version_languageCode_key" ON "AssetTranslation"("version", "languageCode");

-- CreateIndex
CREATE INDEX "RagDocumentMetadata_project_idx" ON "RagDocumentMetadata"("project");

-- CreateIndex
CREATE INDEX "RagDocumentMetadata_regionId_idx" ON "RagDocumentMetadata"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "RagDocumentMetadata_project_documentName_key" ON "RagDocumentMetadata"("project", "documentName");

-- CreateIndex
CREATE INDEX "Tag_project_idx" ON "Tag"("project");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_project_name_key" ON "Tag"("project", "name");

-- CreateIndex
CREATE INDEX "Project_tenantId_idx" ON "Project"("tenantId");

-- CreateIndex
CREATE INDEX "Project_ownerUserId_idx" ON "Project"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_tenantId_name_key" ON "Project"("tenantId", "name");

-- CreateIndex
CREATE INDEX "AIModel_projectId_idx" ON "AIModel"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_projectId_name_key" ON "AIModel"("projectId", "name");

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
CREATE UNIQUE INDEX "SystemPrompt_name_key" ON "SystemPrompt"("name");

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
