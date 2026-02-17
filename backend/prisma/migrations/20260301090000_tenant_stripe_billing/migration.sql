-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "stripePriceId" TEXT,
ADD COLUMN "subscriptionStatus" TEXT,
ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
