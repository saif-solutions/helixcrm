// apps/api/src/modules/contacts/contacts.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Res,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import {
  BulkCreateContactsDto,
  BulkUpdateContactsDto,
  BulkDeleteContactsDto,
  ExportContactsQueryDto,
} from './dto/bulk-contact.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  ContactResponseDto,
  PaginatedContactResponseDto,
} from './dto/contact-response.dto';

// Define interface for authenticated request user
interface AuthenticatedUser {
  organizationId?: string;
  org?: string;
  sub?: string;
  id?: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    const tenantId = req.user?.organizationId ?? req.user?.org;
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant context missing - cannot process request',
      );
    }
    return tenantId;
  }

  private getUserId(req: AuthenticatedRequest): string | undefined {
    return req.user?.sub ?? req.user?.id;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission('contact:write')
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Contact created successfully',
    type: ContactResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Contact with this email already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async create(
    @Body() createContactDto: CreateContactDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    return this.contactsService.create(createContactDto, tenantId, userId);
  }

  @Get()
  @RequirePermission('contact:read')
  @ApiOperation({ summary: 'Get all contacts with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'john' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of contacts',
    type: PaginatedContactResponseDto,
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const sanitizedLimit = Math.min(limit, 100);
    return this.contactsService.findAll(
      { page, limit: sanitizedLimit, search },
      tenantId,
    );
  }

  @Get(':id')
  @RequirePermission('contact:read')
  @ApiOperation({ summary: 'Get a contact by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contact found',
    type: ContactResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.contactsService.findOne(id, tenantId);
  }

  @Put(':id')
  @RequirePermission('contact:write')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contact updated',
    type: ContactResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already in use',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContactDto: UpdateContactDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    return this.contactsService.update(id, updateContactDto, tenantId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('contact:delete')
  @ApiOperation({ summary: 'Delete a contact (soft delete by default)' })
  @ApiQuery({
    name: 'hardDelete',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Contact deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hardDelete') hardDelete?: boolean,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    await this.contactsService.remove(
      id,
      tenantId,
      userId,
      hardDelete ?? false,
    );
    return;
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('contact:write')
  @ApiOperation({ summary: 'Bulk create contacts' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk create completed',
  })
  async bulkCreate(
    @Body() bulkDto: BulkCreateContactsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    return this.contactsService.bulkCreate(bulkDto.contacts, tenantId, userId);
  }

  @Put('bulk')
  @RequirePermission('contact:write')
  @ApiOperation({ summary: 'Bulk update contacts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bulk update completed' })
  async bulkUpdate(
    @Body() bulkDto: BulkUpdateContactsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    return this.contactsService.bulkUpdate(bulkDto.updates, tenantId, userId);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('contact:delete')
  @ApiOperation({ summary: 'Bulk delete contacts' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Bulk delete completed',
  })
  async bulkDelete(
    @Body() bulkDto: BulkDeleteContactsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getUserId(req);
    await this.contactsService.bulkDelete(
      bulkDto.ids,
      tenantId,
      userId,
      bulkDto.hardDelete,
    );
    return;
  }

  @Get('export')
  @RequirePermission('contact:read')
  @ApiOperation({ summary: 'Export contacts to CSV or JSON' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    example: 'csv',
  })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'john' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 1000 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Export file' })
  async export(
    @Query() query: ExportContactsQueryDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const tenantId = this.getTenantId(req);
    const result = await this.contactsService.export(tenantId, {
      format: query.format,
      search: query.search,
      limit: query.limit,
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.data);
  }
}
