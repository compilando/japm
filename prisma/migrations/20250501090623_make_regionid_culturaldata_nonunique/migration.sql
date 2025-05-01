-- DropIndex
DROP INDEX "CulturalData_regionId_key";

-- CreateIndex
CREATE INDEX "CulturalData_regionId_idx" ON "CulturalData"("regionId");
