CREATE TABLE "AiInsight" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "range" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiInsight_tenantId_range_generatedAt_idx" ON "AiInsight"("tenantId", "range", "generatedAt");

ALTER TABLE "AiInsight"
  ADD CONSTRAINT "AiInsight_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
