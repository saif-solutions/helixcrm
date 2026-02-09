import * as fs from 'fs';
import * as path from 'path';

describe('Email Templates Module Structure', () => {
  const emailTemplatesDir = path.join(__dirname, '..');
  
  it('should have all required files', () => {
    const files = [
      'email-templates.controller.ts',
      'email-templates.service.ts',
      'email-templates.module.ts',
      'repositories/email-template.repository.ts',
    ];
    
    files.forEach(file => {
      const filePath = path.join(emailTemplatesDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should verify email-templates.module.ts structure', () => {
    const moduleContent = fs.readFileSync(
      path.join(emailTemplatesDir, 'email-templates.module.ts'),
      'utf8'
    );
    
    expect(moduleContent).toContain('export class EmailTemplatesModule');
    expect(moduleContent).toContain('EmailTemplatesController');
    expect(moduleContent).toContain('EmailTemplatesService');
    expect(moduleContent).toContain('EmailTemplateRepository');
    expect(moduleContent).toContain('BullModule');
    expect(moduleContent).toContain('TenantModule');
    expect(moduleContent).toContain('PermissionsModule');
    expect(moduleContent).toContain('AuditLogModule');
  });

  it('should verify repository pattern usage', () => {
    const serviceContent = fs.readFileSync(
      path.join(emailTemplatesDir, 'email-templates.service.ts'),
      'utf8'
    );
    
    expect(serviceContent).toContain('EmailTemplateRepository');
    expect(serviceContent).toContain('permissionContext.hasPermission');
    expect(serviceContent).toContain('auditLogService.logEvent');
    expect(serviceContent).toContain('tenantContext.getTenantId');
  });

  it('should verify repository is tenant-aware', () => {
    const repoContent = fs.readFileSync(
      path.join(emailTemplatesDir, 'repositories/email-template.repository.ts'),
      'utf8'
    );
    
    expect(repoContent).toContain('extends TenantAwareRepository');
    expect(repoContent).toContain('this.tenantId');
    expect(repoContent).toContain('organizationId: this.tenantId');
  });
});
