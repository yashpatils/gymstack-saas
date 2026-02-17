-- CreateEnum
CREATE TYPE "PlanKey" AS ENUM ('starter', 'pro', 'enterprise');

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "planKey" "PlanKey" NOT NULL DEFAULT 'starter';

-- CreateTable
CREATE TABLE "PlanDefinition" (
    "id" TEXT NOT NULL,
    "key" "PlanKey" NOT NULL,
    "displayName" TEXT NOT NULL,
    "stripePriceId" TEXT,
    "maxLocations" INTEGER NOT NULL,
    "maxStaffSeats" INTEGER NOT NULL,
    "whiteLabelIncluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPlanOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maxLocationsOverride" INTEGER,
    "maxStaffSeatsOverride" INTEGER,
    "whiteLabelOverride" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantPlanOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanDefinition_key_key" ON "PlanDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPlanOverride_tenantId_key" ON "TenantPlanOverride"("tenantId");

-- CreateIndex
CREATE INDEX "TenantPlanOverride_tenantId_idx" ON "TenantPlanOverride"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantPlanOverride" ADD CONSTRAINT "TenantPlanOverride_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed baseline plans
INSERT INTO "PlanDefinition" ("id", "key", "displayName", "maxLocations", "maxStaffSeats", "whiteLabelIncluded", "createdAt", "updatedAt")
VALUES
  ('plan_starter', 'starter', 'Starter', 1, 5, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_pro', 'pro', 'Pro', 5, 25, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_enterprise', 'enterprise', 'Enterprise', 1000, 1000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
