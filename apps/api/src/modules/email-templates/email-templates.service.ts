// apps/api/src/modules/email-templates/email-templates.service.ts
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

// Helper functions with explicit return types
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

function getErrorStack(error: unknown): string {
  return error instanceof Error && error.stack ? error.stack : '';
}

// DTO interfaces
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

// Local interface for permission context
interface PermissionContextWithHasPermission {
  hasPermission(permission: string): boolean;
}

type AuditLogAction =
  | 'EMAIL_TEMPLATE_CREATED'
  | 'EMAIL_TEMPLATE_UPDATED'
  | 'EMAIL_TEMPLATE_DELETED'
  | 'EMAIL_SENT';

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

  // Type-safe severity mapping
  private getSeverity(level: 'info' | 'warning' | 'error'): string {
    // Cast to string – adjust return type if your SeverityMapper expects something else
    return SeverityMapper.forEventType(level) as string;
  }

  // Type-safe permission check
  private checkPermission(permission: string): boolean {
    const context: unknown = this.permissionContext;
    if (this.isPermissionContext(context)) {
      try {
        return context.hasPermission(permission) === true;
      } catch {
        this.logger.debug(
          `Permission check failed for ${permission}, relying on guard`,
        );
        return true;
      }
    }
    this.logger.debug(
      `Permission context not ready for ${permission}, relying on guard`,
    );
    return true;
  }

  private isPermissionContext(
    context: unknown,
  ): context is PermissionContextWithHasPermission {
    return (
      typeof context === 'object' &&
      context !== null &&
      typeof (context as PermissionContextWithHasPermission).hasPermission ===
        'function'
    );
  }

  private getTenantId(): string {
    const id = this.tenantContext.getTenantId();
    return typeof id === 'string' ? id : String(id ?? '');
  }

  private getUserId(): string {
    const id = this.tenantContext.getUserId();
    return typeof id === 'string' ? id : String(id ?? '');
  }

  // ==================== CRUD METHODS ====================

  async createEmailTemplate(createDto: CreateEmailTemplateDto) {
    if (!this.checkPermission('email:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: email:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const nameExists = await this.emailTemplateRepository.nameExists(
        createDto.name,
      );
      if (nameExists) {
        throw new ConflictException(
          `Email template with name "${createDto.name}" already exists`,
        );
      }

      this.validateTemplateBody(createDto.body);

      const template = await this.emailTemplateRepository.create(createDto);

      await this.auditLogService.logEvent({
        action: 'EMAIL_TEMPLATE_CREATED' as AuditLogAction,
        entityId: template.id,
        entityType: 'EMAIL_TEMPLATE',
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
        severity: this.getSeverity('info'),
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
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Create email template failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        data: createDto,
        method: 'createEmailTemplate',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

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

  async getAllEmailTemplates(options?: {
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    if (!this.checkPermission('email:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: email:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const skip = (page - 1) * limit;

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
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Get all email templates failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        options,
        method: 'getAllEmailTemplates',
      } as Record<string, unknown>);
      throw new BadRequestException('Failed to fetch email templates');
    }
  }

  async getEmailTemplateById(id: string) {
    if (!this.checkPermission('email:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: email:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const template = await this.emailTemplateRepository.findById(id);
      if (!template) {
        throw new NotFoundException(`Email template ${id} not found`);
      }
      return template;
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(
        `Get email template by ID failed: ${errMsg}`,
        errStack,
        {
          tenantId,
          userId,
          id,
          method: 'getEmailTemplateById',
        } as Record<string, unknown>,
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

  async updateEmailTemplate(id: string, updateDto: UpdateEmailTemplateDto) {
    if (!this.checkPermission('email:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: email:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const existingTemplate = await this.emailTemplateRepository.findById(id);
      if (!existingTemplate) {
        throw new NotFoundException(`Email template ${id} not found`);
      }

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

      if (updateDto.body) {
        this.validateTemplateBody(updateDto.body);
      }

      const updatedTemplate = await this.emailTemplateRepository.update(
        id,
        updateDto,
      );

      await this.auditLogService.logEvent({
        action: 'EMAIL_TEMPLATE_UPDATED' as AuditLogAction,
        entityId: id,
        entityType: 'EMAIL_TEMPLATE',
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
        severity: this.getSeverity('info'),
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
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Update email template failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        id,
        data: updateDto,
        method: 'updateEmailTemplate',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

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

  async deleteEmailTemplate(id: string) {
    if (!this.checkPermission('email:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: email:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const existingTemplate = await this.emailTemplateRepository.findById(id);
      if (!existingTemplate) {
        throw new NotFoundException(`Email template ${id} not found`);
      }

      const sentEmailCount = await this.sentEmailRepository.countByTemplate(id);
      if (sentEmailCount > 0) {
        throw new ConflictException(
          'Cannot delete template that has sent emails. Consider deactivating instead.',
        );
      }

      await this.emailTemplateRepository.delete(id);

      await this.auditLogService.logEvent({
        action: 'EMAIL_TEMPLATE_DELETED' as AuditLogAction,
        entityId: id,
        entityType: 'EMAIL_TEMPLATE',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          templateId: id,
          name: existingTemplate.name,
          hadSentEmails: false,
        },
        severity: this.getSeverity('warning'),
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
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Delete email template failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        id,
        method: 'deleteEmailTemplate',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

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

  // ==================== RENDER & SEND ====================

  async renderTemplate(renderDto: RenderTemplateDto) {
    if (!this.checkPermission('email:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: email:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const template = await this.emailTemplateRepository.findById(
        renderDto.templateId,
      );
      if (!template) {
        throw new NotFoundException(
          `Email template ${renderDto.templateId} not found`,
        );
      }

      this.validateTemplateVariables(template.variables, renderDto.variables);

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
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Render template failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        data: renderDto,
        method: 'renderTemplate',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to render template');
    }
  }

  async sendEmail(sendDto: SendEmailDto) {
    if (!this.checkPermission('email:send')) {
      throw new ForbiddenException(
        'Insufficient permissions: email:send required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const template = await this.emailTemplateRepository.findById(
        sendDto.templateId,
      );
      if (!template) {
        throw new NotFoundException(
          `Email template ${sendDto.templateId} not found`,
        );
      }

      if (!template.isActive) {
        throw new ConflictException('Email template is not active');
      }

      this.validateTemplateVariables(template.variables, sendDto.variables);

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

      await this.sentEmailRepository.update(sentEmail.id, {
        status: 'queued',
        sentAt: new Date(),
      });

      await this.auditLogService.logEvent({
        action: 'EMAIL_SENT' as AuditLogAction,
        entityId: sentEmail.id,
        entityType: 'SENT_EMAIL',
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
        severity: this.getSeverity('info'),
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
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Send email failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        data: sendDto,
        method: 'sendEmail',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

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
  }

  private validateTemplateVariables(
    availableVariables: string[],
    providedVariables: Record<string, any>,
  ): void {
    const requiredVariables = availableVariables.filter((v) => v.endsWith('*'));
    for (const requiredVar of requiredVariables) {
      const cleanVar = requiredVar.replace('*', '');
      if (!providedVariables[cleanVar]) {
        throw new BadRequestException(
          `Required variable "${cleanVar}" not provided`,
        );
      }
    }

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
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, String(value));
    }
    rendered = rendered.replace(/{{[^{}]+}}/g, '');
    return rendered;
  }

  private convertHtmlToText(html: string): string {
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
      return user?.email ?? `user-${userId}@unknown.example.com`;
    } catch {
      return `user-${userId}@error.example.com`;
    }
  }
}
