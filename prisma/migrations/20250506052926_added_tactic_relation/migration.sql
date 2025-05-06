-- CreateTable
CREATE TABLE "Tactic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "project" TEXT NOT NULL,
    CONSTRAINT "Tactic_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CulturalData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionId" TEXT NOT NULL,
    "formalityLevel" INTEGER,
    "style" TEXT NOT NULL DEFAULT '',
    "considerations" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "project" TEXT NOT NULL,
    "tactic" TEXT,
    CONSTRAINT "CulturalData_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("languageCode") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CulturalData_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CulturalData_tactic_fkey" FOREIGN KEY ("tactic") REFERENCES "Tactic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CulturalData" ("considerations", "formalityLevel", "id", "notes", "project", "regionId", "style") SELECT "considerations", "formalityLevel", "id", "notes", "project", "regionId", "style" FROM "CulturalData";
DROP TABLE "CulturalData";
ALTER TABLE "new_CulturalData" RENAME TO "CulturalData";
CREATE UNIQUE INDEX "CulturalData_tactic_key" ON "CulturalData"("tactic");
CREATE INDEX "CulturalData_regionId_idx" ON "CulturalData"("regionId");
CREATE INDEX "CulturalData_project_idx" ON "CulturalData"("project");
CREATE INDEX "CulturalData_tactic_idx" ON "CulturalData"("tactic");
CREATE TABLE "new_Prompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "project" TEXT NOT NULL,
    "tacticId" TEXT,
    CONSTRAINT "Prompt_project_fkey" FOREIGN KEY ("project") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prompt_tacticId_fkey" FOREIGN KEY ("tacticId") REFERENCES "Tactic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Prompt" ("description", "id", "name", "project") SELECT "description", "id", "name", "project" FROM "Prompt";
DROP TABLE "Prompt";
ALTER TABLE "new_Prompt" RENAME TO "Prompt";
CREATE INDEX "Prompt_project_idx" ON "Prompt"("project");
CREATE INDEX "Prompt_tacticId_idx" ON "Prompt"("tacticId");
CREATE UNIQUE INDEX "Prompt_project_name_key" ON "Prompt"("project", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Tactic_project_idx" ON "Tactic"("project");

-- CreateIndex
CREATE UNIQUE INDEX "Tactic_project_name_key" ON "Tactic"("project", "name");
