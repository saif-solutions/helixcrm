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
import { LeadsService } from "./leads.service";
import { CreateLeadDto, LeadStatus } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { LeadStatus as PrismaLeadStatus } from "@prisma/client";

@Controller("leads")
@UseGuards(AuthGuard, TenantGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

@Post()
@HttpCode(HttpStatus.CREATED)
@UsePipes(ValidationPipe) // Add this line
create(@Body() createLeadDto: CreateLeadDto, @Req() req: Request) {
  return this.leadsService.create({
    ...createLeadDto,
    organizationId: (req as any).user.organizationId,
  });
}

  @Get()
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
      limit: Math.min(limit, 100), // Cap at 100 per page
      status,
      search,
    });
  }

  @Get('stats')
  getStats(@Req() req: Request) {
    return this.leadsService.getStats((req as any).user.organizationId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: Request) {
    return this.leadsService.findOne(id, (req as any).user.organizationId);
  }

  @Put(":id")
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true })) // Allow partial updates
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
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.leadsService.remove(id, (req as any).user.organizationId);
  }
}