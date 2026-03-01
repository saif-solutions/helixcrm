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
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller('contacts')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @RequirePermission('contact:write')
  async create(@Body() createContactDto: CreateContactDto, @Req() req: any) {
    const tenantId = req.user?.organizationId || req.user?.org;
    return this.contactsService.create(createContactDto, tenantId);
  }

  @Get()
  @RequirePermission('contact:read')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search: string = '',
    @Req() req: any,
  ) {
    const tenantId = req.user?.organizationId || req.user?.org;
    return this.contactsService.findAll({ page, limit, search }, tenantId);
  }

  @Get(':id')
  @RequirePermission('contact:read')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.organizationId || req.user?.org;
    return this.contactsService.findOne(id, tenantId);
  }

  @Put(':id')
  @RequirePermission('contact:write')
  async update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
    @Req() req: any,
  ) {
    const tenantId = req.user?.organizationId || req.user?.org;
    return this.contactsService.update(id, updateContactDto, tenantId);
  }

  @Delete(':id')
  @RequirePermission('contact:delete')
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.organizationId || req.user?.org;
    return this.contactsService.remove(id, tenantId);
  }
}