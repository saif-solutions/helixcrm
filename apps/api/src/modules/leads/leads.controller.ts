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
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus as PrismaLeadStatus } from '@prisma/client';

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

// Helper to safely extract user ID from request
function getUserIdFromRequest(req: AuthenticatedRequest): string {
  return req.user?.sub ?? '';
}

@Controller('leads')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission('lead:write')
  create(
    @Body() createLeadDto: CreateLeadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = getUserIdFromRequest(req);
    return this.leadsService.create(createLeadDto, userId);
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
  getStats() {
    return this.leadsService.getStats();
  }

  @Get(':id')
  @RequirePermission('lead:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
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
    const userId = getUserIdFromRequest(req);
    return this.leadsService.update(id, updateLeadDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('lead:delete')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = getUserIdFromRequest(req);
    return this.leadsService.remove(id, userId);
  }
}
