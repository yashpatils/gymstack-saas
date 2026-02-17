ALTER TABLE "User"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN "deletionTokenHash" TEXT,
ADD COLUMN "deletionTokenExpiresAt" TIMESTAMP(3);

CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "User_deletionRequestedAt_idx" ON "User"("deletionRequestedAt");
