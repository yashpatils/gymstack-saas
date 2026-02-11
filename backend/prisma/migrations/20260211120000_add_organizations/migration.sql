-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "Gym" ADD COLUMN "orgId" TEXT;

-- Bootstrap existing data into one default organization per user
INSERT INTO "Organization" ("id", "name", "createdAt")
SELECT CONCAT('org_', u."id"), CONCAT('Org for ', u."email"), CURRENT_TIMESTAMP
FROM "User" u;

INSERT INTO "Membership" ("id", "orgId", "userId", "role", "createdAt")
SELECT CONCAT('membership_', u."id"), CONCAT('org_', u."id"), u."id", 'OWNER'::"MembershipRole", CURRENT_TIMESTAMP
FROM "User" u;

UPDATE "Gym" g
SET "orgId" = CONCAT('org_', g."ownerId");

-- Ensure orgId is required after backfill
ALTER TABLE "Gym" ALTER COLUMN "orgId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_key" ON "Membership"("userId");
CREATE INDEX "Membership_orgId_idx" ON "Membership"("orgId");
CREATE INDEX "Gym_orgId_idx" ON "Gym"("orgId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Gym" ADD CONSTRAINT "Gym_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
