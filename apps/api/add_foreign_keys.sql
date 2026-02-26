-- Add foreign key constraints (now that tables exist)

-- Email Templates foreign key
ALTER TABLE email_templates 
ADD CONSTRAINT email_templates_organization_fkey 
FOREIGN KEY ("organizationId") 
REFERENCES organizations(id) 
ON DELETE CASCADE;

-- Sent Emails foreign keys
ALTER TABLE sent_emails 
ADD CONSTRAINT sent_emails_organization_fkey 
FOREIGN KEY ("organizationId") 
REFERENCES organizations(id) 
ON DELETE CASCADE;

ALTER TABLE sent_emails 
ADD CONSTRAINT sent_emails_template_fkey 
FOREIGN KEY ("templateId") 
REFERENCES email_templates(id) 
ON DELETE SET NULL;

-- Export Jobs foreign key
ALTER TABLE export_jobs 
ADD CONSTRAINT export_jobs_organization_fkey 
FOREIGN KEY ("organizationId") 
REFERENCES organizations(id) 
ON DELETE CASCADE;

-- Webhooks foreign key
ALTER TABLE webhooks 
ADD CONSTRAINT webhooks_organization_fkey 
FOREIGN KEY ("organizationId") 
REFERENCES organizations(id) 
ON DELETE CASCADE;

-- Webhook Deliveries foreign keys
ALTER TABLE webhook_deliveries 
ADD CONSTRAINT webhook_deliveries_organization_fkey 
FOREIGN KEY ("organizationId") 
REFERENCES organizations(id) 
ON DELETE CASCADE;

ALTER TABLE webhook_deliveries 
ADD CONSTRAINT webhook_deliveries_webhook_fkey 
FOREIGN KEY ("webhookId") 
REFERENCES webhooks(id) 
ON DELETE CASCADE;

-- Files foreign key
ALTER TABLE files 
ADD CONSTRAINT files_organization_fkey 
FOREIGN KEY ("organizationId") 
REFERENCES organizations(id) 
ON DELETE CASCADE;
