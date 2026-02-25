// File: src/modules/deals/deals.controller.ts - UPDATED VERSION
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
  Patch,
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

@Controller('deals')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  // ==================== CRUD ENDPOINTS ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission('deals.write')
  create(@Body() createDealDto: CreateDealDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.dealsService.create({
      ...createDealDto,
      // REMOVED: organizationId: user.organizationId, - Tenant context handles this
      userId: user.sub,
    });
  }

  @Get()
  @RequirePermission('deals.read')
  findAll(@Query() query: DealQueryDto, @Req() req: Request) {
    // REMOVED: organizationId parameter - Tenant context handles this
    return this.dealsService.findAll(query);
  }

  @Get('stats')
  @RequirePermission('deals.read')
  getStats(@Req() req: Request, @Query('pipelineId') pipelineId?: string) {
    // REMOVED: organizationId parameter - Tenant context handles this
    return this.dealsService.getDealStats(pipelineId);
  }

  @Get('pipeline-performance')
  @RequirePermission('deals.read')
  getPipelinePerformance(
    @Req() req: Request,
    @Query('pipelineId') pipelineId?: string,
  ) {
    // REMOVED: organizationId parameter - Tenant context handles this
    return this.dealsService.getPipelinePerformance(pipelineId);
  }

  @Get(':id')
  @RequirePermission('deals.read')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    // REMOVED: organizationId parameter - Tenant context handles this
    return this.dealsService.findOne(id, includeDeleted);
  }

  @Get(':id/stage-history')
  @RequirePermission('deals.read')
  getStageHistory(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    // REMOVED: organizationId parameter - Tenant context handles this
    return this.dealsService.getStageHistory(id);
  }

  @Put(':id')
  @UsePipes(
    new ValidationPipe({ transform: true, skipMissingProperties: true }),
  )
  @RequirePermission('deals.write')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDealDto: UpdateDealDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.dealsService.update(
      id,
      updateDealDto,
      user.sub, // Only userId, organizationId comes from tenant context
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('deals.delete')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.dealsService.remove(
      id,
      user.sub, // Only userId, organizationId comes from tenant context
    );
  }

  // ==================== PHASE 3.4 SIMPLIFIED ENDPOINTS ====================

  @Post('simple')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @RequirePermission('deals.write')
  createSimple(
    @Body() createDealSimpleDto: CreateDealSimpleDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.dealsService.createSimple({
      ...createDealSimpleDto,
      // REMOVED: organizationId: user.organizationId, - Tenant context handles this
      userId: user.sub,
    });
  }

  // ==================== DEAL STAGE TRANSITION ENDPOINTS ====================

  @Post(':id/move-stage')
  @HttpCode(HttpStatus.OK)
  @UsePipes(ValidationPipe)
  @RequirePermission('deals.write')
  moveStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moveDealStageDto: MoveDealStageDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.dealsService.moveStage(
      id,
      moveDealStageDto,
      user.sub, // Only userId, organizationId comes from tenant context
    );
  }

  // ==================== BULK OPERATIONS ====================

  @Post('bulk/move-stage')
  @HttpCode(HttpStatus.OK)
  @UsePipes(ValidationPipe)
  @RequirePermission('deals.write')
  bulkMoveStage(
    @Body() body: { dealIds: string[]; stageId: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const { dealIds, stageId } = body;

    // Process each deal in sequence (could be optimized with Promise.all if needed)
    const movePromises = dealIds.map((dealId) =>
      this.dealsService.moveStage(
        dealId,
        { stageId },
        user.sub, // Only userId, organizationId comes from tenant context
      ),
    );

    return Promise.all(movePromises);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('deals.delete')
  bulkRemove(@Body() body: { dealIds: string[] }, @Req() req: Request) {
    const user = (req as any).user;
    const { dealIds } = body;

    // Process each deal in sequence
    const deletePromises = dealIds.map((dealId) =>
      this.dealsService.remove(
        dealId,
        user.sub, // Only userId, organizationId comes from tenant context
      ),
    );

    return Promise.all(deletePromises);
  }
}
