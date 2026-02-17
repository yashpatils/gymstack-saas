-- CreateEnum
CREATE TYPE "TenantBillingStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'GRACE_PERIOD', 'FROZEN', 'CANCELED');

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "billingStatus" "TenantBillingStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "gracePeriodEndsAt" TIMESTAMP(3);
