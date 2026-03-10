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
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard'; // ✅ ADD THIS
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto, LeadStatus } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus as PrismaLeadStatus } from '@prisma/client';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service'; // ✅ ADD THIS

@Controller('leads')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard) // ✅ ADD PermissionGuard here
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly permissionContext: PermissionContextService, // ✅ ADD THIS
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission('lead:write')
  create(@Body() createLeadDto: CreateLeadDto, @Req() req: Request) {
    // ✅ Force PermissionGuard to run
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const user = (req as any).user;
    return this.leadsService.create(createLeadDto, user.sub);
  }

  @Get()
  @RequirePermission('lead:read')
  async findAll(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }

    const user = (req as any).user;
    const tenantId = user?.organizationId || user?.org;

    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant context missing - cannot process request',
      );
    }

    limit = Math.min(limit, 100);

    let statusEnum: PrismaLeadStatus | undefined = undefined;
    if (status) {
      const validStatuses = Object.values(PrismaLeadStatus);
      if (validStatuses.includes(status as PrismaLeadStatus)) {
        statusEnum = status as PrismaLeadStatus;
      }
    }

    return this.leadsService.findAll({
      page,
      limit,
      status: statusEnum,
      search,
    });
  }

  @Get('stats')
  @RequirePermission('report:read')
  getStats() {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    return this.leadsService.getStats();
  }

  @Get(':id')
  @RequirePermission('lead:read')
  findOne(@Param('id') id: string) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    return this.leadsService.findOne(id);
  }

  @Put(':id')
  @UsePipes(
    new ValidationPipe({ transform: true, skipMissingProperties: true }),
  )
  @RequirePermission('lead:write')
  update(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @Req() req: Request,
  ) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const user = (req as any).user;
    return this.leadsService.update(id, updateLeadDto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('lead:delete')
  remove(@Param('id') id: string, @Req() req: Request) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const user = (req as any).user;
    return this.leadsService.remove(id, user.sub);
  }
}
