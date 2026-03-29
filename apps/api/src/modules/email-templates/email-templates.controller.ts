// apps/api/src/modules/email-templates/email-templates.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { EmailTemplatesService } from './email-templates.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEmail,
  IsObject,
} from 'class-validator';

// DTOs
export class CreateEmailTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RenderTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsObject()
  variables: Record<string, any>;
}

export class SendEmailDto {
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsOptional()
  @IsString()
  toName?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @IsObject()
  variables: Record<string, any>;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;
}

// Aliases for Swagger
class CreateEmailTemplateRequestDto extends CreateEmailTemplateDto {}
class UpdateEmailTemplateRequestDto extends UpdateEmailTemplateDto {}
class RenderTemplateRequestDto extends RenderTemplateDto {}
class SendEmailRequestDto extends SendEmailDto {}

@ApiTags('Email Templates')
@ApiBearerAuth()
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new email template' })
  @ApiResponse({
    status: 201,
    description: 'Email template created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  @ApiBody({ type: CreateEmailTemplateRequestDto })
  @RequirePermission('email_templates.manage')
  async createEmailTemplate(
    @Body(new ValidationPipe({ transform: true }))
    createDto: CreateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.createEmailTemplate(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all email templates for current organization' })
  @ApiResponse({
    status: 200,
    description: 'List of email templates with pagination',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @RequirePermission('email_templates.read')
  async getAllEmailTemplates(
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    return this.emailTemplatesService.getAllEmailTemplates({
      category,
      isActive: isActive !== undefined ? isActive === true : undefined,
      page: validatedPage,
      limit: validatedLimit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email template by ID' })
  @ApiResponse({ status: 200, description: 'Email template details' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiParam({ name: 'id', description: 'Email template ID' })
  @RequirePermission('email_templates.read')
  async getEmailTemplateById(@Param('id', ParseUUIDPipe) templateId: string) {
    return this.emailTemplatesService.getEmailTemplateById(templateId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an email template' })
  @ApiResponse({
    status: 200,
    description: 'Email template updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  @ApiParam({ name: 'id', description: 'Email template ID' })
  @ApiBody({ type: UpdateEmailTemplateRequestDto })
  @RequirePermission('email_templates.manage')
  async updateEmailTemplate(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Body(new ValidationPipe({ transform: true }))
    updateDto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.updateEmailTemplate(
      templateId,
      updateDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an email template' })
  @ApiResponse({
    status: 204,
    description: 'Email template deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({
    status: 409,
    description: 'Template has sent emails and cannot be deleted',
  })
  @ApiParam({ name: 'id', description: 'Email template ID' })
  @RequirePermission('email_templates.manage')
  async deleteEmailTemplate(@Param('id', ParseUUIDPipe) templateId: string) {
    return this.emailTemplatesService.deleteEmailTemplate(templateId);
  }

  @Post(':id/render')
  @ApiOperation({ summary: 'Render email template with variables' })
  @ApiResponse({ status: 200, description: 'Template rendered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid variables or missing required variables',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiParam({ name: 'id', description: 'Email template ID' })
  @ApiBody({ type: RenderTemplateRequestDto })
  @RequirePermission('email_templates.read')
  async renderTemplate(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Body(new ValidationPipe({ transform: true })) renderDto: RenderTemplateDto,
  ) {
    return this.emailTemplatesService.renderTemplate({
      ...renderDto,
      templateId,
    });
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send email using template' })
  @ApiResponse({ status: 201, description: 'Email queued for sending' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Template is not active' })
  @ApiParam({ name: 'id', description: 'Email template ID' })
  @ApiBody({ type: SendEmailRequestDto })
  @RequirePermission('email_templates.send')
  async sendEmail(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Body(new ValidationPipe({ transform: true })) sendDto: SendEmailDto,
  ) {
    return this.emailTemplatesService.sendEmail({
      ...sendDto,
      templateId,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get available template categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @RequirePermission('email_templates.read')
  getCategories() {
    return {
      categories: [
        'marketing',
        'transactional',
        'notification',
        'welcome',
        'follow-up',
        'reminder',
        'invoice',
        'receipt',
      ],
    };
  }

  @Get('variables/predefined')
  @ApiOperation({ summary: 'Get predefined template variables' })
  @ApiResponse({ status: 200, description: 'List of predefined variables' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @RequirePermission('email_templates.read')
  getPredefinedVariables() {
    return {
      variables: [
        {
          name: 'contact.firstName',
          description: 'Contact first name',
          required: true,
        },
        {
          name: 'contact.lastName',
          description: 'Contact last name',
          required: true,
        },
        {
          name: 'contact.email',
          description: 'Contact email address',
          required: true,
        },
        { name: 'contact.company', description: 'Contact company name' },
        { name: 'contact.phone', description: 'Contact phone number' },
        { name: 'user.firstName', description: 'Current user first name' },
        { name: 'user.lastName', description: 'Current user last name' },
        { name: 'user.email', description: 'Current user email' },
        { name: 'organization.name', description: 'Organization name' },
        { name: 'organization.email', description: 'Organization email' },
        { name: 'organization.phone', description: 'Organization phone' },
        { name: 'currentDate', description: 'Current date (formatted)' },
        { name: 'currentYear', description: 'Current year' },
      ],
    };
  }
}
