ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "actorEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "actorRole" TEXT,
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;

CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
