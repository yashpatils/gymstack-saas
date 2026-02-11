-- Normalize subscription statuses and make user subscription status required.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";

    CREATE TYPE "SubscriptionStatus" AS ENUM (
      'FREE',
      'TRIAL',
      'ACTIVE',
      'PAST_DUE',
      'CANCELED'
    );

    ALTER TABLE "User"
      ALTER COLUMN "subscriptionStatus" TYPE "SubscriptionStatus"
      USING (
        CASE
          WHEN "subscriptionStatus"::text = 'ACTIVE' THEN 'ACTIVE'::"SubscriptionStatus"
          WHEN "subscriptionStatus"::text = 'PAST_DUE' THEN 'PAST_DUE'::"SubscriptionStatus"
          WHEN "subscriptionStatus"::text = 'CANCELED' THEN 'CANCELED'::"SubscriptionStatus"
          WHEN "subscriptionStatus"::text = 'TRIALING' THEN 'TRIAL'::"SubscriptionStatus"
          ELSE 'FREE'::"SubscriptionStatus"
        END
      );

    DROP TYPE "SubscriptionStatus_old";
  END IF;
END $$;

UPDATE "User"
SET "subscriptionStatus" = 'FREE'
WHERE "subscriptionStatus" IS NULL;

ALTER TABLE "User"
  ALTER COLUMN "subscriptionStatus" SET DEFAULT 'FREE',
  ALTER COLUMN "subscriptionStatus" SET NOT NULL;
