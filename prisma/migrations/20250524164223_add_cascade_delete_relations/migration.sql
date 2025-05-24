-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AssetTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetTranslation_version_fkey" FOREIGN KEY ("version") REFERENCES "PromptAssetVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AssetTranslation" ("createdAt", "id", "languageCode", "updatedAt", "value", "version") SELECT "createdAt", "id", "languageCode", "updatedAt", "value", "version" FROM "AssetTranslation";
DROP TABLE "AssetTranslation";
ALTER TABLE "new_AssetTranslation" RENAME TO "AssetTranslation";
CREATE INDEX "AssetTranslation_version_idx" ON "AssetTranslation"("version");
CREATE INDEX "AssetTranslation_languageCode_idx" ON "AssetTranslation"("languageCode");
CREATE UNIQUE INDEX "AssetTranslation_version_languageCode_key" ON "AssetTranslation"("version", "languageCode");
CREATE TABLE "new_PromptTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "promptText" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptTranslation_version_fkey" FOREIGN KEY ("version") REFERENCES "PromptVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PromptTranslation" ("createdAt", "id", "languageCode", "promptText", "updatedAt", "version") SELECT "createdAt", "id", "languageCode", "promptText", "updatedAt", "version" FROM "PromptTranslation";
DROP TABLE "PromptTranslation";
ALTER TABLE "new_PromptTranslation" RENAME TO "PromptTranslation";
CREATE INDEX "PromptTranslation_version_idx" ON "PromptTranslation"("version");
CREATE INDEX "PromptTranslation_languageCode_idx" ON "PromptTranslation"("languageCode");
CREATE UNIQUE INDEX "PromptTranslation_version_languageCode_key" ON "PromptTranslation"("version", "languageCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
