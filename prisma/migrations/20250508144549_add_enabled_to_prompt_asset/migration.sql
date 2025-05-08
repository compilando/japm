-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromptAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PromptAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PromptAsset" ("createdAt", "id", "key", "projectId", "updatedAt") SELECT "createdAt", "id", "key", "projectId", "updatedAt" FROM "PromptAsset";
DROP TABLE "PromptAsset";
ALTER TABLE "new_PromptAsset" RENAME TO "PromptAsset";
CREATE INDEX "PromptAsset_projectId_idx" ON "PromptAsset"("projectId");
CREATE UNIQUE INDEX "PromptAsset_projectId_key_key" ON "PromptAsset"("projectId", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
