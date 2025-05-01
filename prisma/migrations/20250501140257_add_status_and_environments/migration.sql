/*
  Warnings:

  - You are about to drop the column `activeVersionId` on the `Prompt` table. All the data in the column will be lost.
  - You are about to drop the column `activeVersionId` on the `PromptAsset` table. All the data in the column will be lost.

*/
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prompt" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL DEFAULT '',
    "tactic" TEXT,
    "project" TEXT,
    CONSTRAINT "Prompt_tactic_fkey" FOREIGN KEY ("tactic") REFERENCES "Tactic" ("name") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Prompt_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Prompt" ("description", "name", "project", "tactic") SELECT "description", "name", "project", "tactic" FROM "Prompt";
DROP TABLE "Prompt";
ALTER TABLE "new_Prompt" RENAME TO "Prompt";
CREATE INDEX "Prompt_tactic_idx" ON "Prompt"("tactic");
CREATE INDEX "Prompt_project_idx" ON "Prompt"("project");
CREATE TABLE "new_PromptAsset" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "type" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "project" TEXT,
    CONSTRAINT "PromptAsset_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PromptAsset" ("category", "description", "enabled", "key", "name", "project", "type") SELECT "category", "description", "enabled", "key", "name", "project", "type" FROM "PromptAsset";
DROP TABLE "PromptAsset";
ALTER TABLE "new_PromptAsset" RENAME TO "PromptAsset";
CREATE INDEX "PromptAsset_project_idx" ON "PromptAsset"("project");
CREATE TABLE "new_PromptAssetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asset" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
    "changeMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptAssetVersion_asset_fkey" FOREIGN KEY ("asset") REFERENCES "PromptAsset" ("key") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PromptAssetVersion" ("asset", "changeMessage", "createdAt", "id", "value", "versionTag") SELECT "asset", "changeMessage", "createdAt", "id", "value", "versionTag" FROM "PromptAssetVersion";
DROP TABLE "PromptAssetVersion";
ALTER TABLE "new_PromptAssetVersion" RENAME TO "PromptAssetVersion";
CREATE INDEX "PromptAssetVersion_asset_idx" ON "PromptAssetVersion"("asset");
CREATE UNIQUE INDEX "PromptAssetVersion_asset_versionTag_key" ON "PromptAssetVersion"("asset", "versionTag");
CREATE TABLE "new_PromptVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "promptText" TEXT NOT NULL DEFAULT '',
    "versionTag" TEXT NOT NULL DEFAULT 'v1.0.0',
    "changeMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptVersion_prompt_fkey" FOREIGN KEY ("prompt") REFERENCES "Prompt" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PromptVersion" ("changeMessage", "createdAt", "id", "prompt", "promptText", "versionTag") SELECT "changeMessage", "createdAt", "id", "prompt", "promptText", "versionTag" FROM "PromptVersion";
DROP TABLE "PromptVersion";
ALTER TABLE "new_PromptVersion" RENAME TO "PromptVersion";
CREATE INDEX "PromptVersion_prompt_idx" ON "PromptVersion"("prompt");
CREATE UNIQUE INDEX "PromptVersion_prompt_versionTag_key" ON "PromptVersion"("prompt", "versionTag");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_ActivePromptsInEnvironment_AB_unique" ON "_ActivePromptsInEnvironment"("A", "B");

-- CreateIndex
CREATE INDEX "_ActivePromptsInEnvironment_B_index" ON "_ActivePromptsInEnvironment"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ActiveAssetsInEnvironment_AB_unique" ON "_ActiveAssetsInEnvironment"("A", "B");

-- CreateIndex
CREATE INDEX "_ActiveAssetsInEnvironment_B_index" ON "_ActiveAssetsInEnvironment"("B");
