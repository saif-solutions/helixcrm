import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';

@ApiTags('RBAC - Permissions')
@ApiBearerAuth()
@Controller('rbac/permissions')
// REMOVE: @UseGuards(AuthGuard, PermissionGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'List of all permissions' })
  @RequirePermission('rbac.read')
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Get('grouped')
  @ApiOperation({ summary: 'Get permissions grouped by module' })
  @ApiResponse({ status: 200, description: 'Permissions grouped by module' })
  @RequirePermission('rbac.read')
  async findGrouped() {
    return this.permissionsService.findGrouped();
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get permission hierarchy' })
  @ApiResponse({ status: 200, description: 'Permission hierarchy structure' })
  @RequirePermission('rbac.read')
  async getHierarchy() {
    return this.permissionsService.getPermissionHierarchy();
  }
}