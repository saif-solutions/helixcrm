// apps/api/src/modules/leads/leads.controller.ts

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
  Request,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus as PrismaLeadStatus } from '@prisma/client';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';

// Define interface for authenticated request user
interface AuthenticatedUser {
  sub: string;
  organizationId?: string;
  org?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

// Define extended Request type with user property
interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('leads')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly permissionContext: PermissionContextService,
  ) {}

  private validatePermissionContext(): void {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
  }

  private extractUserFromRequest(req: AuthenticatedRequest): AuthenticatedUser {
    return req.user;
  }

  private extractTenantId(user: AuthenticatedUser): string {
    const tenantId = user.organizationId ?? user.org;
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant context missing - cannot process request',
      );
    }
    return tenantId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission('lead:write')
  create(
    @Body() createLeadDto: CreateLeadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    return this.leadsService.create(createLeadDto, user.sub);
  }

  @Get()
  @RequirePermission('lead:read')
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    this.extractTenantId(user); // Validate tenant exists

    const sanitizedLimit = Math.min(limit, 100);

    let statusEnum: PrismaLeadStatus | undefined;
    if (status) {
      const validStatuses = Object.values(PrismaLeadStatus);
      if (validStatuses.includes(status as PrismaLeadStatus)) {
        statusEnum = status as PrismaLeadStatus;
      }
    }

    return this.leadsService.findAll({
      page,
      limit: sanitizedLimit,
      status: statusEnum,
      search,
    });
  }

  @Get('stats')
  @RequirePermission('report:read')
  getStats(@Req() req: AuthenticatedRequest) {
    this.validatePermissionContext();
    this.extractUserFromRequest(req);
    return this.leadsService.getStats();
  }

  @Get(':id')
  @RequirePermission('lead:read')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    this.extractUserFromRequest(req);
    return this.leadsService.findOne(id);
  }

  @Put(':id')
  @UsePipes(
    new ValidationPipe({ transform: true, skipMissingProperties: true }),
  )
  @RequirePermission('lead:write')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    return this.leadsService.update(id, updateLeadDto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('lead:delete')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    return this.leadsService.remove(id, user.sub);
  }
}
