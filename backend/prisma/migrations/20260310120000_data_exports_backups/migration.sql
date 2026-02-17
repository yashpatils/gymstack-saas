-- CreateEnum
CREATE TYPE "DataExportType" AS ENUM ('members', 'bookings', 'classes', 'attendance', 'full');

-- CreateEnum
CREATE TYPE "DataExportStatus" AS ENUM ('pending', 'processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "PlatformBackupType" AS ENUM ('snapshot');

-- CreateTable
CREATE TABLE "DataExportJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" "DataExportType" NOT NULL,
    "status" "DataExportStatus" NOT NULL DEFAULT 'pending',
    "fileUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformBackup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByAdminId" TEXT NOT NULL,
    "type" "PlatformBackupType" NOT NULL DEFAULT 'snapshot',
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataExportJob_tenantId_createdAt_idx" ON "DataExportJob"("tenantId", "createdAt");
CREATE INDEX "DataExportJob_requestedByUserId_createdAt_idx" ON "DataExportJob"("requestedByUserId", "createdAt");
CREATE INDEX "DataExportJob_status_createdAt_idx" ON "DataExportJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformBackup_tenantId_createdAt_idx" ON "PlatformBackup"("tenantId", "createdAt");
CREATE INDEX "PlatformBackup_createdByAdminId_createdAt_idx" ON "PlatformBackup"("createdByAdminId", "createdAt");

-- AddForeignKey
ALTER TABLE "DataExportJob" ADD CONSTRAINT "DataExportJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataExportJob" ADD CONSTRAINT "DataExportJob_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformBackup" ADD CONSTRAINT "PlatformBackup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformBackup" ADD CONSTRAINT "PlatformBackup_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
