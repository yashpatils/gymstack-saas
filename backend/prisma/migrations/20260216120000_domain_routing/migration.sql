-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFYING', 'ACTIVE', 'ERROR', 'DELETING');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Gym"
ADD COLUMN "slug" TEXT,
ADD COLUMN "displayName" TEXT,
ADD COLUMN "accentColor" TEXT,
ADD COLUMN "heroImageUrl" TEXT;

UPDATE "Gym" SET "slug" = lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr("id", 1, 6) WHERE "slug" IS NULL;

ALTER TABLE "Gym" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Gym_slug_key" ON "Gym"("slug");

-- CreateTable
CREATE TABLE "CustomDomain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "hostname" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "verificationToken" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationInvite_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "CustomDomain_hostname_key" ON "CustomDomain"("hostname");
CREATE INDEX "CustomDomain_tenantId_idx" ON "CustomDomain"("tenantId");
CREATE INDEX "CustomDomain_locationId_idx" ON "CustomDomain"("locationId");
CREATE UNIQUE INDEX "LocationInvite_token_key" ON "LocationInvite"("token");
CREATE INDEX "LocationInvite_tenantId_idx" ON "LocationInvite"("tenantId");
CREATE INDEX "LocationInvite_locationId_idx" ON "LocationInvite"("locationId");

-- AddForeignKey
ALTER TABLE "CustomDomain" ADD CONSTRAINT "CustomDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomDomain" ADD CONSTRAINT "CustomDomain_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomDomain" ADD CONSTRAINT "CustomDomain_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationInvite" ADD CONSTRAINT "LocationInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationInvite" ADD CONSTRAINT "LocationInvite_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationInvite" ADD CONSTRAINT "LocationInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
