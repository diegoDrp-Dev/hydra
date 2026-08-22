CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ANALYST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "ingestionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'informational',
    "host" JSONB,
    "user" JSONB,
    "process" JSONB,
    "network" JSONB,
    "file" JSONB,
    "cloud" JSONB,
    "rawEvent" JSONB NOT NULL,
    "metadata" JSONB,
    "deduplicationKey" TEXT NOT NULL,
    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DetectionRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "severity" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "dataSources" TEXT[],
    "mitreTechniques" TEXT[],
    "tags" TEXT[],
    "authorId" TEXT NOT NULL,
    "falsePositiveNotes" TEXT,
    "references" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DetectionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DetectionMatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DetectionMatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AuditLog" ADD COLUMN "tenantId" TEXT;

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");
CREATE INDEX "TenantMembership_userId_idx" ON "TenantMembership"("userId");
CREATE UNIQUE INDEX "SecurityEvent_tenantId_deduplicationKey_key" ON "SecurityEvent"("tenantId", "deduplicationKey");
CREATE INDEX "SecurityEvent_tenantId_timestamp_idx" ON "SecurityEvent"("tenantId", "timestamp");
CREATE INDEX "SecurityEvent_tenantId_category_action_idx" ON "SecurityEvent"("tenantId", "category", "action");
CREATE INDEX "SecurityEvent_tenantId_sourceType_idx" ON "SecurityEvent"("tenantId", "sourceType");
CREATE UNIQUE INDEX "DetectionRule_tenantId_name_version_key" ON "DetectionRule"("tenantId", "name", "version");
CREATE INDEX "DetectionRule_tenantId_status_idx" ON "DetectionRule"("tenantId", "status");
CREATE UNIQUE INDEX "DetectionMatch_eventId_ruleId_key" ON "DetectionMatch"("eventId", "ruleId");
CREATE INDEX "DetectionMatch_tenantId_createdAt_idx" ON "DetectionMatch"("tenantId", "createdAt");
CREATE INDEX "DetectionMatch_ruleId_createdAt_idx" ON "DetectionMatch"("ruleId", "createdAt");
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DetectionRule" ADD CONSTRAINT "DetectionRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DetectionMatch" ADD CONSTRAINT "DetectionMatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DetectionMatch" ADD CONSTRAINT "DetectionMatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DetectionMatch" ADD CONSTRAINT "DetectionMatch_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "DetectionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
