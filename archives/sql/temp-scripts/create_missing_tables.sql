-- Create missing tables for completed modules
-- These tables don't exist but are needed for the modules we've built

-- 1. Email Templates Module
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    "bodyText" TEXT,
    category TEXT,
    variables JSONB DEFAULT '[]',
    "isActive" BOOLEAN DEFAULT true,
    "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT
);

-- 2. Sent Emails (for email tracking)
CREATE TABLE IF NOT EXISTS sent_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "templateId" UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    to_email TEXT NOT NULL,
    "toName" TEXT,
    cc JSONB DEFAULT '[]',
    bcc JSONB DEFAULT '[]',
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    "bodyText" TEXT,
    status TEXT,
    "errorMessage" TEXT,
    "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    "userId" TEXT,
    "campaignId" TEXT,
    "contactId" TEXT,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- 3. Export Jobs (for export queue module)
CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    format TEXT NOT NULL,
    status TEXT NOT NULL,
    "fileName" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "totalRecords" INTEGER,
    "processedRecords" INTEGER,
    "errorMessage" TEXT,
    "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3)
);

-- 4. Webhooks (for webhooks module)
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events JSONB DEFAULT '[]',
    secret TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT
);

-- 5. Webhook Deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "webhookId" UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB,
    status TEXT NOT NULL,
    "statusCode" INTEGER,
    response TEXT,
    "errorMessage" TEXT,
    "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    attempts INTEGER DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- 6. Files (for file storage module)
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    metadata JSONB,
    "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    "userId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
