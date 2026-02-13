-- Ensure MembershipRole enum values match Prisma schema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'MembershipRole'
      AND n.nspname = 'public'
      AND e.enumlabel IN ('OWNER', 'ADMIN', 'MEMBER')
  ) THEN
    ALTER TYPE "MembershipRole" RENAME TO "MembershipRole_legacy";

    CREATE TYPE "MembershipRole" AS ENUM (
      'tenant_owner',
      'tenant_admin',
      'gym_owner',
      'branch_manager',
      'personal_trainer',
      'client'
    );

    ALTER TABLE "Membership"
      ALTER COLUMN "role" DROP DEFAULT;

    ALTER TABLE "Membership"
      ALTER COLUMN "role" TYPE "MembershipRole"
      USING (
        CASE "role"::text
          WHEN 'OWNER' THEN 'tenant_owner'
          WHEN 'ADMIN' THEN 'tenant_admin'
          WHEN 'MEMBER' THEN 'client'
          ELSE 'client'
        END
      )::"MembershipRole";

    DROP TYPE "MembershipRole_legacy";
  END IF;
END $$;
