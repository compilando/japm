-- CreateTable
CREATE TABLE "PromptExecutionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promptVersionId" TEXT NOT NULL,
    "environmentId" TEXT,
    "userId" TEXT,
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    CONSTRAINT "PromptExecutionLog_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PromptExecutionLog_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromptExecutionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PromptExecutionLog_promptVersionId_idx" ON "PromptExecutionLog"("promptVersionId");

-- CreateIndex
CREATE INDEX "PromptExecutionLog_environmentId_idx" ON "PromptExecutionLog"("environmentId");

-- CreateIndex
CREATE INDEX "PromptExecutionLog_userId_idx" ON "PromptExecutionLog"("userId");

-- CreateIndex
CREATE INDEX "PromptExecutionLog_timestamp_idx" ON "PromptExecutionLog"("timestamp");
