/*
  Warnings:

  - You are about to drop the column `culturalData` on the `ConversationTactic` table. All the data in the column will be lost.
  - The primary key for the `CulturalData` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `region` on the `CulturalData` table. All the data in the column will be lost.
  - The required column `id` was added to the `CulturalData` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `regionId` to the `CulturalData` table without a default value. This is not possible if the table is not empty.

*/
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConversationTactic" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT,
    "culturalDataId" TEXT,
    "tacticsConfig" TEXT,
    CONSTRAINT "ConversationTactic_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("languageCode") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversationTactic_culturalDataId_fkey" FOREIGN KEY ("culturalDataId") REFERENCES "CulturalData" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConversationTactic" ("name", "region", "tacticsConfig") SELECT "name", "region", "tacticsConfig" FROM "ConversationTactic";
DROP TABLE "ConversationTactic";
ALTER TABLE "new_ConversationTactic" RENAME TO "ConversationTactic";
CREATE INDEX "ConversationTactic_region_idx" ON "ConversationTactic"("region");
CREATE INDEX "ConversationTactic_culturalDataId_idx" ON "ConversationTactic"("culturalDataId");
CREATE TABLE "new_CulturalData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionId" TEXT NOT NULL,
    "formalityLevel" INTEGER,
    "style" TEXT NOT NULL DEFAULT '',
    "considerations" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CulturalData_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("languageCode") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CulturalData" ("considerations", "formalityLevel", "notes", "style") SELECT "considerations", "formalityLevel", "notes", "style" FROM "CulturalData";
DROP TABLE "CulturalData";
ALTER TABLE "new_CulturalData" RENAME TO "CulturalData";
CREATE UNIQUE INDEX "CulturalData_regionId_key" ON "CulturalData"("regionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Project_ownerUser_idx" ON "Project"("ownerUser");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_name_key" ON "AIModel"("name");
