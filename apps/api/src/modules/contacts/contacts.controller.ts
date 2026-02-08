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
  @UsePipes(new ValidationPipe({ transform: true }))
  @RequirePermission('contacts.write')
  create(@Body() createContactDto: CreateContactDto) {
    // OrganizationId is now handled by tenant context in service
    return this.contactsService.create(createContactDto);
  }

  @Get()
  @RequirePermission('contacts.read')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.contactsService.findAll({
      page,
      limit: Math.min(limit, 100),
      search,
    });
  }

  @Get(':id')
  @RequirePermission('contacts.read')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Put(':id')
  @UsePipes(
    new ValidationPipe({ transform: true, skipMissingProperties: true }),
  )
  @RequirePermission('contacts.write')
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactsService.update(id, updateContactDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('contacts.delete')
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
