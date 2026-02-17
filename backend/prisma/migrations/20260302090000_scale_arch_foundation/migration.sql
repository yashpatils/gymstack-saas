CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "JobLog" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "JobLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobLog_createdAt_idx" ON "JobLog"("createdAt");
CREATE INDEX "JobLog_status_createdAt_idx" ON "JobLog"("status", "createdAt");

CREATE INDEX "ClassBooking_locationId_bookedAt_idx" ON "ClassBooking"("locationId", "bookedAt");
CREATE INDEX "ClassBooking_userId_createdAt_idx" ON "ClassBooking"("userId", "createdAt");
CREATE INDEX "Membership_gymId_status_idx" ON "Membership"("gymId", "status");
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
