-- Add unique constraints

-- Email Templates: unique name per organization
ALTER TABLE email_templates 
ADD CONSTRAINT email_templates_name_org_unique 
UNIQUE (name, "organizationId");

-- Webhooks: unique name per organization
ALTER TABLE webhooks 
ADD CONSTRAINT webhooks_name_org_unique 
UNIQUE (name, "organizationId");

-- Files: unique filename per organization
ALTER TABLE files 
ADD CONSTRAINT files_filename_org_unique 
UNIQUE (filename, "organizationId");
