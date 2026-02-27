-- CreateTable
CREATE TABLE "CoachClientAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastMessageAt" TIMESTAMP(3),
    "lastReadAtCoach" TIMESTAMP(3),
    "lastReadAtClient" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachClientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachClientMessage" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CoachClientMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachClientAssignment_locationId_coachUserId_clientUserId_key" ON "CoachClientAssignment"("locationId", "coachUserId", "clientUserId");

-- CreateIndex
CREATE INDEX "CoachClientAssignment_tenantId_locationId_idx" ON "CoachClientAssignment"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "CoachClientAssignment_coachUserId_locationId_idx" ON "CoachClientAssignment"("coachUserId", "locationId");

-- CreateIndex
CREATE INDEX "CoachClientAssignment_clientUserId_locationId_idx" ON "CoachClientAssignment"("clientUserId", "locationId");

-- CreateIndex
CREATE INDEX "CoachClientMessage_assignmentId_createdAt_idx" ON "CoachClientMessage"("assignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachClientMessage_senderUserId_createdAt_idx" ON "CoachClientMessage"("senderUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "CoachClientAssignment" ADD CONSTRAINT "CoachClientAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachClientAssignment" ADD CONSTRAINT "CoachClientAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachClientAssignment" ADD CONSTRAINT "CoachClientAssignment_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachClientAssignment" ADD CONSTRAINT "CoachClientAssignment_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachClientAssignment" ADD CONSTRAINT "CoachClientAssignment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachClientMessage" ADD CONSTRAINT "CoachClientMessage_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "CoachClientAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachClientMessage" ADD CONSTRAINT "CoachClientMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
