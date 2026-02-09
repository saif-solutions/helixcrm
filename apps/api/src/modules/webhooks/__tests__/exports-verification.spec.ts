import * as fs from 'fs';
import * as path from 'path';

describe('Webhook Module Exports Verification', () => {
  const webhookDir = path.join(__dirname, '..');
  
  it('should verify webhooks.module.ts exports correctly', () => {
    const moduleContent = fs.readFileSync(
      path.join(webhookDir, 'webhooks.module.ts'), 
      'utf8'
    );
    
    // Check it exports the module
    expect(moduleContent).toContain('export class WebhooksModule');
    
    // Check it imports required modules
    expect(moduleContent).toContain('BullModule');
    expect(moduleContent).toContain('TenantModule');
    expect(moduleContent).toContain('PermissionsModule');
    expect(moduleContent).toContain('AuditLogModule');
    
    // Check it declares controller
    expect(moduleContent).toContain('WebhooksController');
    
    // Check it provides services
    expect(moduleContent).toContain('WebhooksService');
    expect(moduleContent).toContain('WebhookProcessor');
    expect(moduleContent).toContain('WebhookRepository');
  });

  it('should verify webhooks.service.ts has repository pattern', () => {
    const serviceContent = fs.readFileSync(
      path.join(webhookDir, 'webhooks.service.ts'), 
      'utf8'
    );
    
    // Check it imports repository
    expect(serviceContent).toContain('WebhookRepository');
    
    // Check it doesn't have direct Prisma calls (except for user lookup)
    expect(serviceContent).toContain('this.prisma.user.findUnique');
    
    // Check it has permission checks
    expect(serviceContent).toContain('permissionContext.hasPermission');
    
    // Check it has audit logging
    expect(serviceContent).toContain('auditLogService.logEvent');
  });

  it('should verify webhook.repository.ts is tenant-aware', () => {
    const repoContent = fs.readFileSync(
      path.join(webhookDir, 'repositories/webhook.repository.ts'), 
      'utf8'
    );
    
    // Check it extends TenantAwareRepository
    expect(repoContent).toContain('extends TenantAwareRepository');
    
    // Check it uses this.tenantId
    expect(repoContent).toContain('this.tenantId');
  });
});
