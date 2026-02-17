-- Create enums
CREATE TYPE "NotificationType" AS ENUM ('ATTENDANCE_DROP', 'BOOKING_DROP', 'CANCELLATION_SPIKE', 'WEEKLY_DIGEST', 'SYSTEM');
CREATE TYPE "NotificationSeverity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "JobRunStatus" AS ENUM ('success', 'failed');

-- Alter notifications for tenant-scoped retention alerts
ALTER TABLE "Notification"
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "locationId" TEXT,
  ADD COLUMN "severity" "NotificationSeverity" NOT NULL DEFAULT 'info',
  ADD COLUMN "metadata" JSONB;

UPDATE "Notification" n
SET "tenantId" = u."orgId"
FROM "User" u
WHERE n."userId" = u."id";

ALTER TABLE "Notification"
  ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "Notification"
  ALTER COLUMN "type" TYPE "NotificationType"
  USING CASE
    WHEN "type" = 'ATTENDANCE_DROP' THEN 'ATTENDANCE_DROP'::"NotificationType"
    WHEN "type" = 'BOOKING_DROP' THEN 'BOOKING_DROP'::"NotificationType"
    WHEN "type" = 'CANCELLATION_SPIKE' THEN 'CANCELLATION_SPIKE'::"NotificationType"
    WHEN "type" = 'WEEKLY_DIGEST' THEN 'WEEKLY_DIGEST'::"NotificationType"
    ELSE 'SYSTEM'::"NotificationType"
  END;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Notification_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

-- Job run tracking for idempotent scheduled windows
CREATE TABLE "JobRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "jobKey" TEXT NOT NULL,
  "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "JobRunStatus" NOT NULL,
  "error" TEXT,
  CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobRun_jobKey_key" ON "JobRun"("jobKey");
CREATE INDEX "JobRun_tenantId_ranAt_idx" ON "JobRun"("tenantId", "ranAt");

ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
