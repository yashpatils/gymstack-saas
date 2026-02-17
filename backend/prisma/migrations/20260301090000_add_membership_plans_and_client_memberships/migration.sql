-- CreateEnum
CREATE TYPE "MembershipPlanInterval" AS ENUM ('month', 'year', 'week', 'day', 'one_time');

-- CreateEnum
CREATE TYPE "ClientMembershipStatus" AS ENUM ('active', 'paused', 'canceled', 'trialing', 'past_due');

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER,
    "interval" "MembershipPlanInterval" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "planId" TEXT,
    "status" "ClientMembershipStatus" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipPlan_locationId_isActive_idx" ON "MembershipPlan"("locationId", "isActive");

-- CreateIndex
CREATE INDEX "ClientMembership_locationId_userId_idx" ON "ClientMembership"("locationId", "userId");

-- CreateIndex
CREATE INDEX "ClientMembership_locationId_status_idx" ON "ClientMembership"("locationId", "status");

-- CreateIndex
CREATE INDEX "ClientMembership_planId_idx" ON "ClientMembership"("planId");

-- CreateIndex
CREATE INDEX "ClientMembership_createdByUserId_idx" ON "ClientMembership"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientMembership_active_membership_per_location_user" ON "ClientMembership"("userId", "locationId") WHERE "status" IN ('active', 'trialing');

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
