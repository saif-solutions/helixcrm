// apps/api/src/modules/users/users.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service'; // ✅ ADD THIS

@Controller('users')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionContext: PermissionContextService, // ✅ ADD THIS
  ) {}

  @Post()
  @RequirePermission('user:create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    const userId = req.user.sub;
    return this.usersService.create(createUserDto, userId);
  }

  @Get()
  @RequirePermission('user:read')
  async findAll(@Query() query: UserQueryDto) {
    // ✅ Force PermissionGuard to run by checking context
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    return this.usersService.findAll(query);
  }

  @Get('me')
  @RequirePermission('user:read_own')
  getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Get(':id')
  @RequirePermission('user:read')
  async findOne(@Param('id') id: string) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('user:update')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const userId = req.user.sub;
    return this.usersService.update(id, updateUserDto, userId);
  }

  @Delete(':id')
  @RequirePermission('user:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any) {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
    const userId = req.user.sub;
    return this.usersService.remove(id, userId);
  }
}
