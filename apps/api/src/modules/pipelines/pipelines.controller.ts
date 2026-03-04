// apps/api/src/modules/pipelines/pipelines.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Patch,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { CreatePipelineStageDto } from './dto/create-pipeline-stage.dto';
import { UpdatePipelineStageDto } from './dto/update-pipeline-stage.dto';
import { PipelineResponseDto } from './dto/pipeline-response.dto';
import { PaginatedPipelineResponseDto } from './dto/paginated-pipeline-response.dto';

@ApiTags('Pipelines')
@ApiBearerAuth()
@Controller('pipelines')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class PipelinesController {
  private readonly logger = new Logger(PipelinesController.name);

  constructor(private readonly pipelinesService: PipelinesService) {}

  // ==================== PIPELINE ENDPOINTS ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @RequirePermission(['pipeline:write', 'pipeline:manage']) 
  @ApiOperation({
    summary: 'Create a new pipeline',
    description:
      'Creates a new sales pipeline. If isDefault is true, existing default pipeline will be unset.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pipeline created successfully',
    type: PipelineResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Pipeline with same name already exists',
  })
  async create(@Body() createPipelineDto: CreatePipelineDto) {
    this.logger.log(`Creating pipeline: ${createPipelineDto.name}`);
    return await this.pipelinesService.create(createPipelineDto);
  }

  @Get()
  @RequirePermission('pipeline:read')
  @ApiOperation({
    summary: 'Get all pipelines',
    description: 'Returns paginated list of pipelines with optional search',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by pipeline name or description',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipelines retrieved successfully',
    type: PaginatedPipelineResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    this.logger.log(
      `Fetching pipelines - page: ${page}, limit: ${limit}, search: ${search}`,
    );
    return await this.pipelinesService.findAll({
      page: Math.max(1, page),
      limit: Math.max(1, Math.min(limit, 100)),
      search,
    });
  }

  @Get('default')
  @RequirePermission('pipeline:read') 
  @ApiOperation({
    summary: 'Get default pipeline',
    description:
      'Returns the currently configured default pipeline for the organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default pipeline found',
    type: PipelineResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No default pipeline found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getDefault() {
    this.logger.log('Fetching default pipeline');
    return await this.pipelinesService.getDefaultPipeline();
  }

  @Get(':id')
  @RequirePermission('pipeline:read') 
  @ApiOperation({
    summary: 'Get pipeline by ID',
    description: 'Returns a specific pipeline with its stages and deal count',
  })
  @ApiParam({
    name: 'id',
    description: 'Pipeline ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline found',
    type: PipelineResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async findOne(@Param('id') id: string) {
    this.logger.log(`Fetching pipeline: ${id}`);
    return await this.pipelinesService.findOne(id);
  }

  @Put(':id')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      skipMissingProperties: true,
    }),
  )
  @RequirePermission(['pipeline:write', 'pipeline:manage']) 
  @ApiOperation({
    summary: 'Update pipeline',
    description:
      'Updates a pipeline. If isDefault is set to true, any existing default pipeline will be unset.',
  })
  @ApiParam({
    name: 'id',
    description: 'Pipeline ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline updated successfully',
    type: PipelineResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async update(
    @Param('id') id: string,
    @Body() updatePipelineDto: UpdatePipelineDto,
  ) {
    this.logger.log(`Updating pipeline: ${id}`);
    return await this.pipelinesService.update(id, updatePipelineDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(['pipeline:manage']) 
  @ApiOperation({
    summary: 'Delete pipeline',
    description:
      'Deletes a pipeline. Cannot delete if pipeline has active deals.',
  })
  @ApiParam({
    name: 'id',
    description: 'Pipeline ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Pipeline deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Pipeline has active deals',
  })
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting pipeline: ${id}`);
    return await this.pipelinesService.remove(id);
  }

  // ==================== PIPELINE STAGE ENDPOINTS ====================

  @Post(':id/stages')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @RequirePermission(['pipeline:write', 'pipeline:manage']) 
  @ApiOperation({
    summary: 'Create pipeline stage',
    description: 'Creates a new stage within a pipeline',
  })
  @ApiParam({
    name: 'id',
    description: 'Pipeline ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Stage created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Stage with same order already exists',
  })
  async createStage(
    @Param('id') pipelineId: string,
    @Body() createStageDto: CreatePipelineStageDto,
  ) {
    this.logger.log(`Creating stage in pipeline: ${pipelineId}`);
    return await this.pipelinesService.createStage(pipelineId, createStageDto);
  }

  @Put('stages/:id')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      skipMissingProperties: true,
    }),
  )
  @RequirePermission(['pipeline:write', 'pipeline:manage']) 
  @ApiOperation({
    summary: 'Update pipeline stage',
    description: 'Updates an existing pipeline stage',
  })
  @ApiParam({
    name: 'id',
    description: 'Stage ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stage updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Stage not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Stage with same order already exists',
  })
  async updateStage(
    @Param('id') stageId: string,
    @Body() updateStageDto: UpdatePipelineStageDto,
  ) {
    this.logger.log(`Updating stage: ${stageId}`);
    return await this.pipelinesService.updateStage(stageId, updateStageDto);
  }

  @Delete('stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(['pipeline:manage']) 
  @ApiOperation({
    summary: 'Delete pipeline stage',
    description: 'Deletes a pipeline stage',
  })
  @ApiParam({
    name: 'id',
    description: 'Stage ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Stage deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Stage not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Stage has active deals',
  })
  async removeStage(@Param('id') stageId: string) {
    this.logger.log(`Deleting stage: ${stageId}`);
    return await this.pipelinesService.removeStage(stageId);
  }

  @Patch(':id/stages/reorder')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(['pipeline:manage'])
  @ApiOperation({
    summary: 'Reorder pipeline stages',
    description: 'Updates the order of stages within a pipeline',
  })
  @ApiParam({
    name: 'id',
    description: 'Pipeline ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stages reordered successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid stage IDs',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipeline or stages not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async reorderStages(
    @Param('id') pipelineId: string,
    @Body() body: { stageIds: string[] },
  ) {
    this.logger.log(`Reordering stages in pipeline: ${pipelineId}`);
    return await this.pipelinesService.reorderStages(pipelineId, body.stageIds);
  }
}