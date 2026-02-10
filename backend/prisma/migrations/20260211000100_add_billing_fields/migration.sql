-- Ensure subscription enum exists for billing status tracking.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM (
      'INACTIVE',
      'ACTIVE',
      'PAST_DUE',
      'CANCELED',
      'TRIALING',
      'INCOMPLETE'
    );
  END IF;
END $$;

-- Ensure all billing/subscription user columns exist and remain nullable.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus";

-- Keep Prisma uniqueness invariants for Stripe identifiers.
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- Relax old non-null/default constraints in case they were applied previously.
ALTER TABLE "User"
  ALTER COLUMN "subscriptionStatus" DROP NOT NULL,
  ALTER COLUMN "subscriptionStatus" DROP DEFAULT;
