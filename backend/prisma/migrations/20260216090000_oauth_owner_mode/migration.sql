-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('google', 'apple');

-- CreateEnum
CREATE TYPE "ActiveMode" AS ENUM ('OWNER', 'MANAGER');

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerSubject" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerOperatorSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "allowOwnerStaffLogin" BOOLEAN NOT NULL DEFAULT false,
    "defaultMode" "ActiveMode" NOT NULL DEFAULT 'OWNER',
    "defaultLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerOperatorSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerSubject_key" ON "AuthIdentity"("provider", "providerSubject");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerOperatorSetting_userId_tenantId_key" ON "OwnerOperatorSetting"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "OwnerOperatorSetting_tenantId_idx" ON "OwnerOperatorSetting"("tenantId");

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerOperatorSetting" ADD CONSTRAINT "OwnerOperatorSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerOperatorSetting" ADD CONSTRAINT "OwnerOperatorSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
