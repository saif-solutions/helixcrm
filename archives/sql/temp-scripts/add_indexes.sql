-- Add indexes for performance

-- Email Templates indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates("organizationId");
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates("organizationId", category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS idx_email_templates_deleted ON email_templates("deletedAt");

-- Sent Emails indexes
CREATE INDEX IF NOT EXISTS idx_sent_emails_org ON sent_emails("organizationId");
CREATE INDEX IF NOT EXISTS idx_sent_emails_template ON sent_emails("organizationId", "templateId");
CREATE INDEX IF NOT EXISTS idx_sent_emails_status ON sent_emails("organizationId", status);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails("organizationId", "sentAt");
CREATE INDEX IF NOT EXISTS idx_sent_emails_created ON sent_emails("organizationId", "createdAt");

-- Export Jobs indexes
CREATE INDEX IF NOT EXISTS idx_export_jobs_org ON export_jobs("organizationId");
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs("organizationId", status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_type ON export_jobs("organizationId", type);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created ON export_jobs("organizationId", "createdAt");

-- Webhooks indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks("organizationId");
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS idx_webhooks_deleted ON webhooks("deletedAt");

-- Webhook Deliveries indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_org ON webhook_deliveries("organizationId");
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries("organizationId", "webhookId");
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries("organizationId", status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_attempt ON webhook_deliveries("nextAttemptAt");

-- Files indexes
CREATE INDEX IF NOT EXISTS idx_files_org_deleted ON files("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS idx_files_user_deleted ON files("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS idx_files_mimetype ON files("mimeType");
CREATE INDEX IF NOT EXISTS idx_files_created ON files("createdAt");
