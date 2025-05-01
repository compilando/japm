-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "_PromptTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PromptTags_A_fkey" FOREIGN KEY ("A") REFERENCES "ConversationPrompt" ("name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PromptTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_PromptTags_AB_unique" ON "_PromptTags"("A", "B");

-- CreateIndex
CREATE INDEX "_PromptTags_B_index" ON "_PromptTags"("B");
