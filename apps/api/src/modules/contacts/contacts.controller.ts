//D:\Projects-In-Hand\helixcrm\apps\api\src\modules\contacts\contacts.controller.ts

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
  ValidationPipe
} from "@nestjs/common";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { ContactsService } from "./contacts.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";

@Controller("contacts")
@UseGuards(AuthGuard, TenantGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() createContactDto: CreateContactDto, @Req() req: Request) {
    return this.contactsService.create({
      ...createContactDto,
      organizationId: (req as any).user.organizationId,
    });
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.contactsService.findAll({
      organizationId: (req as any).user.organizationId,
      page,
      limit: Math.min(limit, 100),
      search,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: Request) {
    return this.contactsService.findOne(id, (req as any).user.organizationId);
  }

  @Put(":id")
  @UsePipes(new ValidationPipe({ transform: true, skipMissingProperties: true }))
  update(
    @Param("id") id: string,
    @Body() updateContactDto: UpdateContactDto,
    @Req() req: Request,
  ) {
    return this.contactsService.update(
      id,
      updateContactDto,
      (req as any).user.organizationId,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @Req() req: Request) {
    return this.contactsService.remove(id, (req as any).user.organizationId);
  }
}