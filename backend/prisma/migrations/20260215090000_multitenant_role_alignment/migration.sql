-- Align membership role/status enums with multi-tenant MVP role model.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'MembershipRole'
      AND n.nspname = 'public'
  ) THEN
    ALTER TYPE "MembershipRole" RENAME TO "MembershipRole_legacy";

    CREATE TYPE "MembershipRole" AS ENUM (
      'TENANT_OWNER',
      'TENANT_LOCATION_ADMIN',
      'GYM_STAFF_COACH',
      'CLIENT'
    );

    ALTER TABLE "Membership"
      ALTER COLUMN "role" DROP DEFAULT;

    ALTER TABLE "Membership"
      ALTER COLUMN "role" TYPE "MembershipRole"
      USING (
        CASE "role"::text
          WHEN 'tenant_owner' THEN 'TENANT_OWNER'
          WHEN 'tenant_admin' THEN 'TENANT_LOCATION_ADMIN'
          WHEN 'gym_owner' THEN 'TENANT_LOCATION_ADMIN'
          WHEN 'branch_manager' THEN 'TENANT_LOCATION_ADMIN'
          WHEN 'personal_trainer' THEN 'GYM_STAFF_COACH'
          WHEN 'client' THEN 'CLIENT'
          ELSE 'CLIENT'
        END
      )::"MembershipRole";

    DROP TYPE "MembershipRole_legacy";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'MembershipStatus'
      AND n.nspname = 'public'
  ) THEN
    ALTER TYPE "MembershipStatus" RENAME TO "MembershipStatus_legacy";

    CREATE TYPE "MembershipStatus" AS ENUM (
      'ACTIVE',
      'INVITED',
      'DISABLED'
    );

    ALTER TABLE "Membership"
      ALTER COLUMN "status" DROP DEFAULT;

    ALTER TABLE "Membership"
      ALTER COLUMN "status" TYPE "MembershipStatus"
      USING (
        CASE "status"::text
          WHEN 'SUSPENDED' THEN 'DISABLED'
          ELSE "status"::text
        END
      )::"MembershipStatus";

    ALTER TABLE "Membership"
      ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

    DROP TYPE "MembershipStatus_legacy";
  END IF;
END $$;
