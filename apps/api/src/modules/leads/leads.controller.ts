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
  ValidationPipe
} from "@nestjs/common";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { PermissionGuard } from "../../shared/guards/permission.guard";
import { RequirePermission } from "../../shared/decorators/require-permission.decorator";
import { LeadsService } from "./leads.service";
import { CreateLeadDto, LeadStatus } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { LeadStatus as PrismaLeadStatus } from "@prisma/client";

@Controller("leads")
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission('leads.write')
  create(@Body() createLeadDto: CreateLeadDto, @Req() req: Request) {
    return this.leadsService.create({
      ...createLeadDto,
      organizationId: (req as any).user.organizationId,
    });
  }

  @Get()
  @RequirePermission('leads.read')
  findAll(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: PrismaLeadStatus,
    @Query('search') search?: string,
  ) {
    return this.leadsService.findAll({
      organizationId: (req as any).user.organizationId,
      page,
      limit: Math.min(limit, 100),
      status,
      search,
    });
  }

  @Get('stats')
  @RequirePermission(['leads.read', 'analytics.read'])
  getStats(@Req() req: Request) {
    return this.leadsService.getStats((req as any).user.organizationId);
  }

  @Get(":id")
  @RequirePermission('leads.read')
  findOne(@Param("id") id: string, @Req() req: Request) {
    return this.leadsService.findOne(id, (req as any).user.organizationId);
  }

  @Put(":id")
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  @RequirePermission('leads.write')
  update(
    @Param("id") id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @Req() req: Request,
  ) {
    return this.leadsService.update(
      id,
      updateLeadDto,
      (req as any).user.organizationId,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('leads.delete')
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.leadsService.remove(id, (req as any).user.organizationId);
  }
}