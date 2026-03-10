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
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { MoveDealStageDto } from './dto/move-deal-stage.dto';
import { DealQueryDto } from './dto/deal-query.dto';
import { CreateDealSimpleDto } from './dto/create-deal-simple.dto';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';

@Controller('deals')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly permissionContext: PermissionContextService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission('deal:write')
  create(@Body() createDealDto: CreateDealDto, @Req() req: Request) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const user = (req as any).user;
    return this.dealsService.create({
      ...createDealDto,
      userId: user.sub,
    });
  }

  @Get()
  @RequirePermission('deal:read')
  async findAll(@Query() query: DealQueryDto, @Req() req: Request) {
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

    if (query.skip !== undefined && query.take !== undefined) {
      query.page = Math.floor(query.skip / query.take) + 1;
      query.limit = query.take;
    }

    return this.dealsService.findAll(query);
  }

  @Get('stats')
  @RequirePermission('report:read')
  getStats(@Req() req: Request, @Query('pipelineId') pipelineId?: string) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    return this.dealsService.getDealStats(pipelineId);
  }

  @Get('pipeline-performance')
  @RequirePermission('report:read')
  getPipelinePerformance(
    @Req() req: Request,
    @Query('pipelineId') pipelineId?: string,
  ) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    return this.dealsService.getPipelinePerformance(pipelineId);
  }

  @Get(':id')
  @RequirePermission('deal:read')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    return this.dealsService.findOne(id, includeDeleted);
  }

  @Get(':id/stage-history')
  @RequirePermission('deal:read')
  getStageHistory(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
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
    @Req() req: Request,
  ) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const user = (req as any).user;
    return this.dealsService.update(id, updateDealDto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('deal:delete')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const user = (req as any).user;
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
    @Req() req: Request,
  ) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const user = (req as any).user;
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
    @Req() req: Request,
  ) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const user = (req as any).user;
    return this.dealsService.moveStage(id, moveDealStageDto, user.sub);
  }

  @Post('bulk/move-stage')
  @HttpCode(HttpStatus.OK)
  @UsePipes(ValidationPipe)
  @RequirePermission('deal:write')
  bulkMoveStage(
    @Body() body: { dealIds: string[]; stageId: string },
    @Req() req: Request,
  ) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const user = (req as any).user;
    const { dealIds, stageId } = body;

    const movePromises = dealIds.map((dealId) =>
      this.dealsService.moveStage(dealId, { stageId }, user.sub),
    );

    return Promise.all(movePromises);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('deal:delete')
  bulkRemove(@Body() body: { dealIds: string[] }, @Req() req: Request) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const user = (req as any).user;
    const { dealIds } = body;

    const deletePromises = dealIds.map((dealId) =>
      this.dealsService.remove(dealId, user.sub),
    );

    return Promise.all(deletePromises);
  }
}
