-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('STRIPE', 'RAZORPAY');

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "billingProvider" "BillingProvider" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN "billingCountry" TEXT,
ADD COLUMN "billingCurrency" TEXT,
ADD COLUMN "billingCustomerId" TEXT,
ADD COLUMN "billingSubscriptionId" TEXT,
ADD COLUMN "billingPriceId" TEXT,
ADD COLUMN "providerMetadata" JSONB,
ALTER COLUMN "subscriptionStatus" TYPE "SubscriptionStatus" USING
  CASE
    WHEN "subscriptionStatus" IS NULL THEN 'FREE'::"SubscriptionStatus"
    WHEN LOWER("subscriptionStatus") = 'free' THEN 'FREE'::"SubscriptionStatus"
    WHEN LOWER("subscriptionStatus") = 'trial' OR LOWER("subscriptionStatus") = 'trialing' THEN 'TRIAL'::"SubscriptionStatus"
    WHEN LOWER("subscriptionStatus") = 'active' THEN 'ACTIVE'::"SubscriptionStatus"
    WHEN LOWER("subscriptionStatus") = 'past_due' OR LOWER("subscriptionStatus") = 'past due' THEN 'PAST_DUE'::"SubscriptionStatus"
    WHEN LOWER("subscriptionStatus") = 'canceled' OR LOWER("subscriptionStatus") = 'cancelled' OR LOWER("subscriptionStatus") = 'unpaid' THEN 'CANCELED'::"SubscriptionStatus"
    ELSE 'FREE'::"SubscriptionStatus"
  END,
ALTER COLUMN "subscriptionStatus" SET DEFAULT 'FREE',
ALTER COLUMN "subscriptionStatus" SET NOT NULL;

UPDATE "Organization"
SET
  "billingCustomerId" = COALESCE("billingCustomerId", "stripeCustomerId"),
  "billingSubscriptionId" = COALESCE("billingSubscriptionId", "stripeSubscriptionId"),
  "billingPriceId" = COALESCE("billingPriceId", "stripePriceId");
