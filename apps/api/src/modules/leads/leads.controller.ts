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
} from '@nestjs/common';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto, LeadStatus } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus as PrismaLeadStatus } from '@prisma/client';

@Controller('leads')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission('leads.write')
  create(@Body() createLeadDto: CreateLeadDto, @Req() req: Request) {
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
  // Ensure limit is within limits
  limit = Math.min(limit, 100);
  
  // Convert status string to enum if it matches valid values
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
  @RequirePermission('lead:read')  // Note: singular, colon format
  getStats() {
    return this.leadsService.getStats();
  }

  @Get(':id')
  @RequirePermission('lead:read')  // Note: singular, colon format
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Put(':id')
  @UsePipes(
    new ValidationPipe({ transform: true, skipMissingProperties: true }),
  )
  @RequirePermission('leads.write')
  update(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.leadsService.update(id, updateLeadDto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('leads.delete')
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.leadsService.remove(id, user.sub);
  }
}
