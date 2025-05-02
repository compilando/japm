/*
  Warnings:

  - A unique constraint covering the columns `[promptVersion,assetVersion]` on the table `PromptAssetLink` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PromptAssetLink_promptVersion_assetVersion_key" ON "PromptAssetLink"("promptVersion", "assetVersion");
