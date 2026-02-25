import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EmailTemplateRepository } from './repositories/email-template.repository';
import { SentEmailRepository } from './repositories/sent-email.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { SeverityMapper } from '../../shared/audit-log/severity-mapper';
import { PrismaService } from '../../shared/prisma/prisma.service';

// Define DTO interfaces locally in the service file
export interface CreateEmailTemplateDto {
  name: string;
  subject: string;
  body: string;
  bodyText?: string;
  category?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface UpdateEmailTemplateDto {
  name?: string;
  subject?: string;
  body?: string;
  bodyText?: string;
  category?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface RenderTemplateDto {
  templateId: string;
  variables: Record<string, any>;
}

export interface SendEmailDto {
  templateId: string;
  to: string;
  toName?: string;
  cc?: string[];
  bcc?: string[];
  variables: Record<string, any>;
  campaignId?: string;
  contactId?: string;
}

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    private readonly emailTemplateRepository: EmailTemplateRepository,
    private readonly sentEmailRepository: SentEmailRepository,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new email template
   */
  async createEmailTemplate(createDto: CreateEmailTemplateDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('email_templates.manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: email_templates.manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VALIDATE TEMPLATE NAME UNIQUENESS
      const nameExists = await this.emailTemplateRepository.nameExists(
        createDto.name,
      );
      if (nameExists) {
        throw new ConflictException(
          `Email template with name "${createDto.name}" already exists`,
        );
      }

      // 3. VALIDATE TEMPLATE BODY
      this.validateTemplateBody(createDto.body);

      // 4. CREATE TEMPLATE USING REPOSITORY
      const template = await this.emailTemplateRepository.create(createDto);

      // 5. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'EMAIL_TEMPLATE_CREATED' as any,
        entityId: template.id,
        entityType: 'EMAIL_TEMPLATE' as any,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          templateId: template.id,
          name: template.name,
          category: template.category,
          isActive: template.isActive,
          variablesCount: template.variables.length,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`Email template created successfully`, {
        templateId: template.id,
        tenantId,
        userId,
        name: template.name,
        eventType: 'email_template_created',
        processingTime: Date.now() - startTime,
      });

      return template;
    } catch (error: any) {
      // 6. ERROR HANDLING
      this.logger.error(
        `Create email template failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          data: createDto,
          method: 'createEmailTemplate',
          processingTime: Date.now() - startTime,
        },
      );

      if (
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create email template');
    }
  }

  /**
   * Get all email templates for current tenant
   */
  async getAllEmailTemplates(options?: {
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('email_templates.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: email_templates.read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const skip = (page - 1) * limit;

      // 2. GET TEMPLATES USING REPOSITORY
      const [templates, total] = await Promise.all([
        this.emailTemplateRepository.findAll({
          category: options?.category,
          isActive: options?.isActive,
          skip,
          take: limit,
        }),
        this.emailTemplateRepository.count({
          category: options?.category,
          isActive: options?.isActive,
        }),
      ]);

      return {
        data: templates,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Get all email templates failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          options,
          method: 'getAllEmailTemplates',
        },
      );
      throw new BadRequestException('Failed to fetch email templates');
    }
  }

  /**
   * Get email template by ID
   */
  async getEmailTemplateById(id: string) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('email_templates.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: email_templates.read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET TEMPLATE USING REPOSITORY
      const template = await this.emailTemplateRepository.findById(id);

      if (!template) {
        throw new NotFoundException(`Email template ${id} not found`);
      }

      return template;
    } catch (error: any) {
      this.logger.error(
        `Get email template by ID failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          id,
          method: 'getEmailTemplateById',
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch email template');
    }
  }

  /**
   * Update email template
   */
  async updateEmailTemplate(id: string, updateDto: UpdateEmailTemplateDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('email_templates.manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: email_templates.manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET EXISTING TEMPLATE
      const existingTemplate = await this.emailTemplateRepository.findById(id);
      if (!existingTemplate) {
        throw new NotFoundException(`Email template ${id} not found`);
      }

      // 3. VALIDATE NAME UNIQUENESS IF CHANGING
      if (updateDto.name && updateDto.name !== existingTemplate.name) {
        const nameExists = await this.emailTemplateRepository.nameExists(
          updateDto.name,
          id,
        );
        if (nameExists) {
          throw new ConflictException(
            `Email template with name "${updateDto.name}" already exists`,
          );
        }
      }

      // 4. VALIDATE TEMPLATE BODY IF CHANGING
      if (updateDto.body) {
        this.validateTemplateBody(updateDto.body);
      }

      // 5. UPDATE TEMPLATE USING REPOSITORY
      const updatedTemplate = await this.emailTemplateRepository.update(
        id,
        updateDto,
      );

      // 6. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'EMAIL_TEMPLATE_UPDATED' as any,
        entityId: id,
        entityType: 'EMAIL_TEMPLATE' as any,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          templateId: id,
          updatedFields: Object.keys(updateDto),
          oldName: existingTemplate.name,
          newName: updatedTemplate.name,
          isActive: updatedTemplate.isActive,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`Email template updated successfully`, {
        templateId: id,
        tenantId,
        userId,
        updatedFields: Object.keys(updateDto),
        eventType: 'email_template_updated',
        processingTime: Date.now() - startTime,
      });

      return updatedTemplate;
    } catch (error: any) {
      // 7. ERROR HANDLING
      this.logger.error(
        `Update email template failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          id,
          data: updateDto,
          method: 'updateEmailTemplate',
          processingTime: Date.now() - startTime,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to update email template');
    }
  }

  /**
   * Delete email template
   */
  async deleteEmailTemplate(id: string) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('email_templates.manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: email_templates.manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET EXISTING TEMPLATE
      const existingTemplate = await this.emailTemplateRepository.findById(id);
      if (!existingTemplate) {
        throw new NotFoundException(`Email template ${id} not found`);
      }

      // 3. CHECK IF TEMPLATE HAS SENT EMAILS
      const sentEmailCount = await this.sentEmailRepository.countByTemplate(id);

      if (sentEmailCount > 0) {
        throw new ConflictException(
          'Cannot delete template that has sent emails. Consider deactivating instead.',
        );
      }

      // 4. DELETE TEMPLATE USING REPOSITORY
      await this.emailTemplateRepository.delete(id);

      // 5. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'EMAIL_TEMPLATE_DELETED' as any,
        entityId: id,
        entityType: 'EMAIL_TEMPLATE' as any,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          templateId: id,
          name: existingTemplate.name,
          hadSentEmails: false,
        },
        severity: SeverityMapper.forEventType('warning'),
      });

      this.logger.log(`Email template deleted successfully`, {
        templateId: id,
        tenantId,
        userId,
        name: existingTemplate.name,
        eventType: 'email_template_deleted',
        processingTime: Date.now() - startTime,
      });

      return { message: 'Email template deleted successfully' };
    } catch (error: any) {
      // 6. ERROR HANDLING
      this.logger.error(
        `Delete email template failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          id,
          method: 'deleteEmailTemplate',
          processingTime: Date.now() - startTime,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to delete email template');
    }
  }

  /**
   * Render template with variables
   */
  async renderTemplate(renderDto: RenderTemplateDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('email_templates.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: email_templates.read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET TEMPLATE
      const template = await this.emailTemplateRepository.findById(
        renderDto.templateId,
      );
      if (!template) {
        throw new NotFoundException(
          `Email template ${renderDto.templateId} not found`,
        );
      }

      // 3. VALIDATE PROVIDED VARIABLES
      this.validateTemplateVariables(template.variables, renderDto.variables);

      // 4. RENDER TEMPLATE
      const rendered = this.renderTemplateContent(
        template.body,
        renderDto.variables,
      );
      const renderedText = template.bodyText
        ? this.renderTemplateContent(template.bodyText, renderDto.variables)
        : this.convertHtmlToText(rendered);

      const renderedSubject = this.renderTemplateContent(
        template.subject,
        renderDto.variables,
      );

      this.logger.log(`Template rendered successfully`, {
        templateId: renderDto.templateId,
        tenantId,
        userId,
        variablesCount: Object.keys(renderDto.variables).length,
        eventType: 'email_template_rendered',
        processingTime: Date.now() - startTime,
      });

      return {
        subject: renderedSubject,
        body: rendered,
        bodyText: renderedText,
        template: {
          id: template.id,
          name: template.name,
          variables: template.variables,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Render template failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          data: renderDto,
          method: 'renderTemplate',
          processingTime: Date.now() - startTime,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to render template');
    }
  }

  /**
   * Send email using template
   */
  async sendEmail(sendDto: SendEmailDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('email_templates.send')) {
      throw new ForbiddenException(
        'Insufficient permissions: email_templates.send required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET TEMPLATE
      const template = await this.emailTemplateRepository.findById(
        sendDto.templateId,
      );
      if (!template) {
        throw new NotFoundException(
          `Email template ${sendDto.templateId} not found`,
        );
      }

      // 3. CHECK IF TEMPLATE IS ACTIVE
      if (!template.isActive) {
        throw new ConflictException('Email template is not active');
      }

      // 4. VALIDATE VARIABLES
      this.validateTemplateVariables(template.variables, sendDto.variables);

      // 5. RENDER TEMPLATE
      const renderedSubject = this.renderTemplateContent(
        template.subject,
        sendDto.variables,
      );
      const renderedBody = this.renderTemplateContent(
        template.body,
        sendDto.variables,
      );
      const renderedBodyText = template.bodyText
        ? this.renderTemplateContent(template.bodyText, sendDto.variables)
        : this.convertHtmlToText(renderedBody);

      // 6. CREATE SENT EMAIL RECORD
      const sentEmail = await this.sentEmailRepository.create({
        templateId: sendDto.templateId,
        to: sendDto.to,
        toName: sendDto.toName,
        cc: sendDto.cc,
        bcc: sendDto.bcc,
        subject: renderedSubject,
        body: renderedBody,
        bodyText: renderedBodyText,
        status: 'pending',
        campaignId: sendDto.campaignId,
        contactId: sendDto.contactId,
        userId: userId,
      });

      // 7. QUEUE EMAIL FOR BACKGROUND SENDING
      await this.sentEmailRepository.update(sentEmail.id, {
        status: 'queued',
        sentAt: new Date(),
      });

      // 8. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'EMAIL_SENT' as any,
        entityId: sentEmail.id,
        entityType: 'SENT_EMAIL' as any,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          emailId: sentEmail.id,
          templateId: sendDto.templateId,
          to: sendDto.to,
          subject: renderedSubject,
          campaignId: sendDto.campaignId,
          contactId: sendDto.contactId,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`Email queued for sending`, {
        emailId: sentEmail.id,
        templateId: sendDto.templateId,
        tenantId,
        userId,
        to: sendDto.to,
        eventType: 'email_queued',
        processingTime: Date.now() - startTime,
      });

      return {
        emailId: sentEmail.id,
        message: 'Email queued for sending successfully',
        estimatedSendTime: 'immediate',
        preview: {
          subject: renderedSubject,
          to: sendDto.to,
        },
      };
    } catch (error: any) {
      this.logger.error(`Send email failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        data: sendDto,
        method: 'sendEmail',
        processingTime: Date.now() - startTime,
      });

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to send email');
    }
  }

  // ==================== HELPER METHODS ====================

  private validateTemplateBody(body: string): void {
    if (!body || body.trim().length === 0) {
      throw new BadRequestException('Template body cannot be empty');
    }

    if (body.length > 100000) {
      throw new BadRequestException(
        'Template body is too long (max 100,000 characters)',
      );
    }

    // Add more validation as needed (HTML sanitization, etc.)
  }

  private validateTemplateVariables(
    availableVariables: string[],
    providedVariables: Record<string, any>,
  ): void {
    // Check for required variables
    const requiredVariables = availableVariables.filter((v) => v.endsWith('*'));
    for (const requiredVar of requiredVariables) {
      const cleanVar = requiredVar.replace('*', '');
      if (!providedVariables[cleanVar]) {
        throw new BadRequestException(
          `Required variable "${cleanVar}" not provided`,
        );
      }
    }

    // Warn about unused variables (optional)
    const usedVariables = Object.keys(providedVariables);
    const unusedVariables = usedVariables.filter(
      (v) =>
        !availableVariables.includes(v) &&
        !availableVariables.includes(`${v}*`),
    );

    if (unusedVariables.length > 0) {
      this.logger.warn(
        `Unused variables provided: ${unusedVariables.join(', ')}`,
      );
    }
  }

  private renderTemplateContent(
    content: string,
    variables: Record<string, any>,
  ): string {
    let rendered = content;

    // Replace variable placeholders: {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, String(value));
    }

    // Remove any remaining placeholders (optional variables)
    rendered = rendered.replace(/{{[^{}]+}}/g, '');

    return rendered;
  }

  private convertHtmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\s*\/?>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || `user-${userId}@unknown.example.com`;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch email for user ${userId}: ${error.message}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }
}
