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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';

@Controller('users')
@UseGuards(AuthGuard, TenantGuard) // TenantContextGuard removed
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission('users.create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    const userId = req.user.sub;
    return this.usersService.create(createUserDto, userId);
  }

  @Get()
  @RequirePermission('users.read')
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @RequirePermission('users.read_own')
  getProfile(@Request() req: any) {
    const userId = req.user.sub;
    return this.usersService.getProfile(userId);
  }

  @Get(':id')
  @RequirePermission('users.read')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('users.update')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.usersService.update(id, updateUserDto, userId);
  }

  @Delete(':id')
  @RequirePermission('users.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub;
    return this.usersService.remove(id, userId);
  }
}