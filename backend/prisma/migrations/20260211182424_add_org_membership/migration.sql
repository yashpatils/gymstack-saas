DO $$
BEGIN
  CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Membership" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

DROP INDEX IF EXISTS "Membership_userId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_orgId_userId_key" ON "Membership"("orgId", "userId");
CREATE INDEX IF NOT EXISTS "Membership_orgId_idx" ON "Membership"("orgId");
CREATE INDEX IF NOT EXISTS "Membership_userId_idx" ON "Membership"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Membership_orgId_fkey'
  ) THEN
    ALTER TABLE "Membership"
      ADD CONSTRAINT "Membership_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Membership_userId_fkey'
  ) THEN
    ALTER TABLE "Membership"
      ADD CONSTRAINT "Membership_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "Membership" ("id", "orgId", "userId", "role", "createdAt")
SELECT CONCAT('membership_', u."id"), u."orgId", u."id", 'OWNER'::"MembershipRole", CURRENT_TIMESTAMP
FROM "User" u
WHERE u."orgId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Membership" m
    WHERE m."orgId" = u."orgId" AND m."userId" = u."id"
  );
