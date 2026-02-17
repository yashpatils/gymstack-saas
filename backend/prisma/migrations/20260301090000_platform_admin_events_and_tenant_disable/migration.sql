-- Alter organization with soft-disable fields
ALTER TABLE "Organization"
ADD COLUMN "isDisabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "disabledAt" TIMESTAMP(3);

-- Create admin event audit table
CREATE TABLE "AdminEvent" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "tenantId" TEXT,
  "metadata" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AdminEvent"
ADD CONSTRAINT "AdminEvent_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminEvent"
ADD CONSTRAINT "AdminEvent_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AdminEvent_adminUserId_createdAt_idx" ON "AdminEvent"("adminUserId", "createdAt");
CREATE INDEX "AdminEvent_tenantId_createdAt_idx" ON "AdminEvent"("tenantId", "createdAt");
CREATE INDEX "AdminEvent_type_idx" ON "AdminEvent"("type");
