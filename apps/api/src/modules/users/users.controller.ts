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
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';

// Type definition for authenticated request
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    organizationId: string;
    permissions?: string[];
    roles?: string[];
  };
}

@Controller('users')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionContext: PermissionContextService,
  ) {}

  /**
   * Helper method to ensure permission context is initialized
   */
  private ensurePermissionContext(): void {
    if (!this.permissionContext.isInitialized()) {
      throw new ForbiddenException('Permission context not initialized');
    }
  }

  @Post()
  @RequirePermission('user:create')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createUserDto: CreateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.usersService.create(createUserDto, userId);
  }

  @Get()
  @RequirePermission('user:read')
  async findAll(@Query() query: UserQueryDto) {
    this.ensurePermissionContext();
    return this.usersService.findAll(query);
  }

  @Get('me')
  @RequirePermission('user:read_own')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Get(':id')
  @RequirePermission('user:read')
  async findOne(@Param('id') id: string) {
    this.ensurePermissionContext();
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('user:update')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.ensurePermissionContext();
    const userId = req.user.sub;
    return this.usersService.update(id, updateUserDto, userId);
  }

  @Delete(':id')
  @RequirePermission('user:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    this.ensurePermissionContext();
    const userId = req.user.sub;
    return this.usersService.remove(id, userId);
  }
}
