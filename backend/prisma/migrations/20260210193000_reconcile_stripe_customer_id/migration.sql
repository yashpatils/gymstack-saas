-- Ensure stripeCustomerId exists even if prior migration history drifted from the actual database schema.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

-- Keep the Prisma schema invariant for @unique on stripeCustomerId.
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
