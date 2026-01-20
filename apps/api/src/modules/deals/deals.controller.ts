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
} from "@nestjs/common";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { DealsService } from "./deals.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { MoveDealStageDto } from "./dto/move-deal-stage.dto";
import { DealQueryDto } from "./dto/deal-query.dto";

@Controller("deals")
@UseGuards(AuthGuard, TenantGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  // ==================== CRUD ENDPOINTS ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  create(@Body() createDealDto: CreateDealDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.dealsService.create({
      ...createDealDto,
      organizationId: user.organizationId,
      userId: user.userId,
    });
  }

  @Get()
  findAll(@Query() query: DealQueryDto, @Req() req: Request) {
    return this.dealsService.findAll(
      (req as any).user.organizationId,
      query
    );
  }

  @Get("stats")
  getStats(
    @Req() req: Request,
    @Query('pipelineId') pipelineId?: string,
  ) {
    return this.dealsService.getDealStats(
      (req as any).user.organizationId,
      pipelineId
    );
  }

  @Get("pipeline-performance")
  getPipelinePerformance(
    @Req() req: Request,
    @Query('pipelineId') pipelineId?: string,
  ) {
    return this.dealsService.getPipelinePerformance(
      (req as any).user.organizationId,
      pipelineId
    );
  }

  @Get(":id")
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    return this.dealsService.findOne(
      id,
      (req as any).user.organizationId,
      includeDeleted
    );
  }

  @Get(":id/stage-history")
  getStageHistory(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.dealsService.getStageHistory(
      id,
      (req as any).user.organizationId
    );
  }

  @Put(":id")
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDealDto: UpdateDealDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.dealsService.update(
      id,
      updateDealDto,
      user.organizationId,
      user.userId,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.dealsService.remove(
      id,
      user.organizationId,
      user.userId,
    );
  }

  // ==================== DEAL STAGE TRANSITION ENDPOINTS ====================

  @Post(":id/move-stage")
  @HttpCode(HttpStatus.OK)
  @UsePipes(ValidationPipe)
  moveStage(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() moveDealStageDto: MoveDealStageDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    return this.dealsService.moveStage(
      id,
      moveDealStageDto,
      user.organizationId,
      user.userId,
    );
  }

  // ==================== BULK OPERATIONS ====================

  @Post("bulk/move-stage")
  @HttpCode(HttpStatus.OK)
  @UsePipes(ValidationPipe)
  bulkMoveStage(
    @Body() body: { dealIds: string[]; stageId: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const { dealIds, stageId } = body;
    
    // Process each deal in sequence (could be optimized with Promise.all if needed)
    const movePromises = dealIds.map(dealId => 
      this.dealsService.moveStage(
        dealId,
        { stageId },
        user.organizationId,
        user.userId,
      )
    );
    
    return Promise.all(movePromises);
  }

  @Delete("bulk")
  @HttpCode(HttpStatus.NO_CONTENT)
  bulkRemove(
    @Body() body: { dealIds: string[] },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const { dealIds } = body;
    
    // Process each deal in sequence
    const deletePromises = dealIds.map(dealId => 
      this.dealsService.remove(
        dealId,
        user.organizationId,
        user.userId,
      )
    );
    
    return Promise.all(deletePromises);
  }
}