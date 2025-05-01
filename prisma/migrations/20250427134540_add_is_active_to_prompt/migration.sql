-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConversationPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "promptText" TEXT NOT NULL DEFAULT '',
    "region" TEXT,
    "version" TEXT NOT NULL DEFAULT '',
    "tactic" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ConversationPrompt_region_fkey" FOREIGN KEY ("region") REFERENCES "Region" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConversationPrompt_tactic_fkey" FOREIGN KEY ("tactic") REFERENCES "ConversationTactic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConversationPrompt" ("description", "id", "name", "promptText", "region", "tactic", "version") SELECT "description", "id", "name", "promptText", "region", "tactic", "version" FROM "ConversationPrompt";
DROP TABLE "ConversationPrompt";
ALTER TABLE "new_ConversationPrompt" RENAME TO "ConversationPrompt";
CREATE INDEX "ConversationPrompt_region_idx" ON "ConversationPrompt"("region");
CREATE INDEX "ConversationPrompt_tactic_idx" ON "ConversationPrompt"("tactic");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
