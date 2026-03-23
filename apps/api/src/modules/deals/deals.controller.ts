// apps/api/src/modules/deals/deals.controller.ts
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
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { MoveDealStageDto } from './dto/move-deal-stage.dto';
import { DealQueryDto } from './dto/deal-query.dto';
import { CreateDealSimpleDto } from './dto/create-deal-simple.dto';
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

@Controller('deals')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
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
  @RequirePermission('deal:write')
  create(
    @Body() createDealDto: CreateDealDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    return this.dealsService.create({
      ...createDealDto,
      userId: user.sub,
    });
  }

  @Get()
  @RequirePermission('deal:read')
  async findAll(
    @Query() query: DealQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    this.extractTenantId(user); // Validate tenant exists

    // Convert skip/take to page/limit if provided
    if (query.skip !== undefined && query.take !== undefined) {
      query.page = Math.floor(query.skip / query.take) + 1;
      query.limit = query.take;
    }

    return this.dealsService.findAll(query);
  }

  @Get('stats')
  @RequirePermission('report:read')
  getStats(
    @Req() req: AuthenticatedRequest,
    @Query('pipelineId') pipelineId?: string,
  ) {
    this.validatePermissionContext();
    this.extractUserFromRequest(req);
    return this.dealsService.getDealStats(pipelineId);
  }

  @Get('pipeline-performance')
  @RequirePermission('report:read')
  getPipelinePerformance(
    @Req() req: AuthenticatedRequest,
    @Query('pipelineId') pipelineId?: string,
  ) {
    this.validatePermissionContext();
    this.extractUserFromRequest(req);
    return this.dealsService.getPipelinePerformance(pipelineId);
  }

  @Get(':id')
  @RequirePermission('deal:read')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    this.validatePermissionContext();
    this.extractUserFromRequest(req);
    return this.dealsService.findOne(id, includeDeleted);
  }

  @Get(':id/stage-history')
  @RequirePermission('deal:read')
  getStageHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    this.extractUserFromRequest(req);
    return this.dealsService.getStageHistory(id);
  }

  @Put(':id')
  @UsePipes(
    new ValidationPipe({ transform: true, skipMissingProperties: true }),
  )
  @RequirePermission('deal:write')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDealDto: UpdateDealDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    return this.dealsService.update(id, updateDealDto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('deal:delete')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    return this.dealsService.remove(id, user.sub);
  }

  @Post('simple')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @RequirePermission('deal:write')
  createSimple(
    @Body() createDealSimpleDto: CreateDealSimpleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    return this.dealsService.createSimple({
      ...createDealSimpleDto,
      userId: user.sub,
    });
  }

  @Post(':id/move-stage')
  @HttpCode(HttpStatus.OK)
  @UsePipes(ValidationPipe)
  @RequirePermission('deal:write')
  moveStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moveDealStageDto: MoveDealStageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    return this.dealsService.moveStage(id, moveDealStageDto, user.sub);
  }

  @Post('bulk/move-stage')
  @HttpCode(HttpStatus.OK)
  @UsePipes(ValidationPipe)
  @RequirePermission('deal:write')
  async bulkMoveStage(
    @Body() body: { dealIds: string[]; stageId: string },
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    const { dealIds, stageId } = body;

    const movePromises = dealIds.map((dealId) =>
      this.dealsService.moveStage(dealId, { stageId }, user.sub),
    );

    return Promise.all(movePromises);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('deal:delete')
  async bulkRemove(
    @Body() body: { dealIds: string[] },
    @Req() req: AuthenticatedRequest,
  ) {
    this.validatePermissionContext();
    const user = this.extractUserFromRequest(req);
    const { dealIds } = body;

    const deletePromises = dealIds.map((dealId) =>
      this.dealsService.remove(dealId, user.sub),
    );

    await Promise.all(deletePromises);
    return;
  }
}
