-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "description" TEXT,
    "apiIdentifier" TEXT,
    "apiKeyEnvVar" TEXT,
    "temperature" REAL DEFAULT 0.7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxTokens" INTEGER,
    "supportsJson" BOOLEAN NOT NULL DEFAULT false,
    "contextWindow" INTEGER,
    "project" TEXT,
    CONSTRAINT "AIModel_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AIModel" ("apiIdentifier", "contextWindow", "createdAt", "description", "id", "maxTokens", "name", "provider", "supportsJson") SELECT "apiIdentifier", "contextWindow", "createdAt", "description", "id", "maxTokens", "name", "provider", "supportsJson" FROM "AIModel";
DROP TABLE "AIModel";
ALTER TABLE "new_AIModel" RENAME TO "AIModel";
CREATE INDEX "AIModel_project_idx" ON "AIModel"("project");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
