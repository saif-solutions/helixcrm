// src/modules/rbac/roles.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RemoveRoleDto } from './dto/remove-role.dto';
import { RoleQueryDto } from './dto/role-query.dto';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';

@ApiTags('RBAC - Roles')
@ApiBearerAuth()
@Controller('rbac/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all roles in organization' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  @ApiQuery({ type: RoleQueryDto })
  @RequirePermission('rbac.read')
  async findAll(@Request() req: any, @Query() query: RoleQueryDto) {
    // REMOVED: organizationId parameter
    return this.rolesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @RequirePermission('rbac.read')
  async findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    // REMOVED: organizationId parameter
    return this.rolesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  @RequirePermission('rbac.manage')
  async create(@Request() req: any, @Body() createRoleDto: CreateRoleDto) {
    // REMOVED: organizationId and userId parameters
    return this.rolesService.create(createRoleDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'Cannot modify system role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @RequirePermission('rbac.manage')
  async update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    // REMOVED: organizationId and userId parameters
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'Cannot delete system role' })
  @ApiResponse({ status: 409, description: 'Role has assigned users' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @RequirePermission('rbac.manage')
  async remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    // REMOVED: organizationId and userId parameters
    return this.rolesService.remove(id);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  @ApiResponse({ status: 409, description: 'Role already assigned' })
  @RequirePermission('rbac.manage')
  async assignRole(@Request() req: any, @Body() assignRoleDto: AssignRoleDto) {
    // REMOVED: organizationId and userId parameters
    return this.rolesService.assignRole(assignRoleDto);
  }

  @Post('remove')
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 404, description: 'Role assignment not found' })
  @ApiResponse({ status: 403, description: 'Cannot remove last admin' })
  @RequirePermission('rbac.manage')
  async removeRole(@Request() req: any, @Body() removeRoleDto: RemoveRoleDto) {
    // REMOVED: organizationId and userId parameters
    return this.rolesService.removeRole(removeRoleDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get roles assigned to a user' })
  @ApiResponse({ status: 200, description: "User's roles" })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @RequirePermission('rbac.read')
  async getUserRoles(
    @Request() req: any,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    // REMOVED: organizationId parameter
    return this.rolesService.getUserRoles(userId);
  }
}
