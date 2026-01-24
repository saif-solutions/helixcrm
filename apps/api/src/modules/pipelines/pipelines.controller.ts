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
  Patch,
} from "@nestjs/common";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { PermissionGuard } from "../../shared/guards/permission.guard";
import { RequirePermission } from "../../shared/decorators/require-permission.decorator";
import { PipelinesService } from "./pipelines.service";
import { CreatePipelineDto } from "./dto/create-pipeline.dto";
import { UpdatePipelineDto } from "./dto/update-pipeline.dto";
import { CreatePipelineStageDto } from "./dto/create-pipeline-stage.dto";
import { UpdatePipelineStageDto } from "./dto/update-pipeline-stage.dto";

@Controller("pipelines")
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  // ==================== PIPELINE ENDPOINTS ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission(['pipelines.write', 'pipelines.manage'])
  create(@Body() createPipelineDto: CreatePipelineDto, @Req() req: Request) {
    return this.pipelinesService.create({
      ...createPipelineDto,
      organizationId: (req as any).user.organizationId,
    });
  }

  @Get()
  @RequirePermission('pipelines.read')
  findAll(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.pipelinesService.findAll({
      organizationId: (req as any).user.organizationId,
      page,
      limit: Math.min(limit, 100),
      search,
    });
  }

  @Get('default')
  @RequirePermission('pipelines.read')
  getDefault(@Req() req: Request) {
    return this.pipelinesService.getDefaultPipeline((req as any).user.organizationId);
  }

  @Get(":id")
  @RequirePermission('pipelines.read')
  findOne(@Param("id") id: string, @Req() req: Request) {
    return this.pipelinesService.findOne(id, (req as any).user.organizationId);
  }

  @Put(":id")
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  @RequirePermission(['pipelines.write', 'pipelines.manage'])
  update(
    @Param("id") id: string,
    @Body() updatePipelineDto: UpdatePipelineDto,
    @Req() req: Request,
  ) {
    return this.pipelinesService.update(
      id,
      updatePipelineDto,
      (req as any).user.organizationId,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(['pipelines.manage'])
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.pipelinesService.remove(id, (req as any).user.organizationId);
  }

  // ==================== PIPELINE STAGE ENDPOINTS ====================

  @Post(":id/stages")
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission(['pipelines.write', 'pipelines.manage'])
  createStage(
    @Param("id") pipelineId: string,
    @Body() createStageDto: CreatePipelineStageDto,
    @Req() req: Request,
  ) {
    return this.pipelinesService.createStage(
      pipelineId,
      createStageDto,
      (req as any).user.organizationId,
    );
  }

  @Put("stages/:id")
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  @RequirePermission(['pipelines.write', 'pipelines.manage'])
  updateStage(
    @Param("id") stageId: string,
    @Body() updateStageDto: UpdatePipelineStageDto,
    @Req() req: Request,
  ) {
    return this.pipelinesService.updateStage(
      stageId,
      updateStageDto,
      (req as any).user.organizationId,
    );
  }

  @Delete("stages/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(['pipelines.manage'])
  removeStage(
    @Param("id") stageId: string,
    @Req() req: Request,
  ) {
    return this.pipelinesService.removeStage(
      stageId,
      (req as any).user.organizationId,
    );
  }

  @Patch(":id/stages/reorder")
  @HttpCode(HttpStatus.OK)
  @RequirePermission(['pipelines.manage'])
  reorderStages(
    @Param("id") pipelineId: string,
    @Body() body: { stageIds: string[] },
    @Req() req: Request,
  ) {
    return this.pipelinesService.reorderStages(
      pipelineId,
      body.stageIds,
      (req as any).user.organizationId,
    );
  }
}