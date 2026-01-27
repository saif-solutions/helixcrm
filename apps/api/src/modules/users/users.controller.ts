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
  HttpStatus 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';

@Controller('users')
@UseGuards(AuthGuard, TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission('users.create')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: any,
  ) {
    const organizationId = req.organizationId;
    const userId = req.user.sub;
    return this.usersService.create(organizationId, createUserDto, userId);
  }

  @Get()
  @RequirePermission('users.read')
  findAll(
    @Query() query: UserQueryDto,
    @Request() req: any,
  ) {
    const organizationId = req.organizationId;
    return this.usersService.findAll(organizationId, query);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  getProfile(@Request() req: any) {
    const userId = req.user.sub;
    return this.usersService.getProfile(userId);
  }

  @Get(':id')
  @RequirePermission('users.read')
  findOne(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const organizationId = req.organizationId;
    return this.usersService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermission('users.update')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    const organizationId = req.organizationId;
    const userId = req.user.sub;
    return this.usersService.update(organizationId, id, updateUserDto, userId);
  }

  @Delete(':id')
  @RequirePermission('users.delete')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const organizationId = req.organizationId;
    const userId = req.user.sub;
    return this.usersService.remove(organizationId, id, userId);
  }
}
