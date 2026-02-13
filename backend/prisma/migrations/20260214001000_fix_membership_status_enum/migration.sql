-- Ensure MembershipStatus enum exists with expected values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'MembershipStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
  END IF;
END $$;

-- Normalize legacy text statuses before converting column type.
UPDATE "Membership"
SET "status" = CASE
  WHEN UPPER("status") = 'ACTIVE' THEN 'ACTIVE'
  WHEN UPPER("status") = 'INVITED' THEN 'INVITED'
  WHEN UPPER("status") = 'SUSPENDED' THEN 'SUSPENDED'
  ELSE 'ACTIVE'
END
WHERE "status" IS DISTINCT FROM CASE
  WHEN UPPER("status") = 'ACTIVE' THEN 'ACTIVE'
  WHEN UPPER("status") = 'INVITED' THEN 'INVITED'
  WHEN UPPER("status") = 'SUSPENDED' THEN 'SUSPENDED'
  ELSE 'ACTIVE'
END;

-- Convert Membership.status column to enum if it is not already using MembershipStatus.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Membership'
      AND column_name = 'status'
      AND udt_name <> 'MembershipStatus'
  ) THEN
    ALTER TABLE "Membership"
      ALTER COLUMN "status" TYPE "MembershipStatus"
      USING ("status"::"MembershipStatus");
  END IF;
END $$;

ALTER TABLE "Membership"
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
  ALTER COLUMN "status" SET NOT NULL;
