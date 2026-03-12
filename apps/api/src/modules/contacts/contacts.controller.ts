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
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

// Type definition for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    organizationId?: string;
    org?: string;
    sub?: string;
    [key: string]: any;
  };
}

@Controller('contacts')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission('contact:write')
  async create(
    @Body() createContactDto: CreateContactDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.contactsService.create(createContactDto, tenantId);
  }

  @Get()
  @RequirePermission('contact:read')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search: string = '',
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.contactsService.findAll({ page, limit, search }, tenantId);
  }

  @Get(':id')
  @RequirePermission('contact:read')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.contactsService.findOne(id, tenantId);
  }

  @Put(':id')
  @RequirePermission('contact:write')
  async update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.contactsService.update(id, updateContactDto, tenantId);
  }

  @Delete(':id')
  @RequirePermission('contact:delete')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    return this.contactsService.remove(id, tenantId);
  }

  /**
   * Helper method to safely extract tenant ID from request
   */
  private getTenantId(req: AuthenticatedRequest): string {
    const tenantId = req.user?.organizationId || req.user?.org;
    if (!tenantId) {
      throw new Error('Tenant context missing - cannot process request');
    }
    return tenantId;
  }
}
