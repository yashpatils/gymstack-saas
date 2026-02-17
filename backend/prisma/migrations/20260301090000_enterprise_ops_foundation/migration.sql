-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "FeatureFlagScope" AS ENUM ('GLOBAL', 'TENANT', 'LOCATION');

-- AlterTable
ALTER TABLE "AuditLog"
ADD COLUMN "actorType" "AuditActorType" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN "actorUserId" TEXT,
ADD COLUMN "locationId" TEXT,
ADD COLUMN "targetId" TEXT,
ADD COLUMN "targetType" TEXT,
ADD COLUMN "tenantId" TEXT;

-- Backfill from legacy fields
UPDATE "AuditLog"
SET
  "actorUserId" = COALESCE("actorUserId", "userId"),
  "tenantId" = COALESCE("tenantId", "orgId"),
  "targetType" = COALESCE("targetType", "entityType"),
  "targetId" = COALESCE("targetId", "entityId"),
  "actorType" = CASE
    WHEN COALESCE("actorUserId", "userId") IS NOT NULL THEN 'USER'::"AuditActorType"
    ELSE 'SYSTEM'::"AuditActorType"
  END;

-- CreateTable
CREATE TABLE "FeatureFlag" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "scope" "FeatureFlagScope" NOT NULL DEFAULT 'GLOBAL',
  "tenantId" TEXT,
  "locationId" TEXT,
  "updatedByUserId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_scope_tenantId_locationId_key" ON "FeatureFlag"("key", "scope", "tenantId", "locationId");

-- CreateIndex
CREATE INDEX "FeatureFlag_scope_key_idx" ON "FeatureFlag"("scope", "key");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_locationId_idx" ON "AuditLog"("locationId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
