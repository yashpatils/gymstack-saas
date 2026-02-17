ALTER TABLE "AuditLog"
  ADD COLUMN "actorEmail" TEXT,
  ADD COLUMN "actorRole" TEXT,
  ADD COLUMN "ipAddress" TEXT;

CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
