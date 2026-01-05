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
  Request 
} from "@nestjs/common";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { ContactsService } from "./contacts.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";

@Controller("contacts")
@UseGuards(AuthGuard, TenantGuard) // ✅ CRITICAL: Both guards required
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Body() createContactDto: CreateContactDto, @Req() req: Request) {
    // Application-level tenant enforcement
    return this.contactsService.create({
      ...createContactDto,
      organizationId: (req as any).user.organizationId, // ✅ Injected from guard
    });
  }

  @Get()
  findAll(@Req() req: Request) {
    // Application-level tenant enforcement
    return this.contactsService.findAll((req as any).user.organizationId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req: Request) {
    // Application-level tenant enforcement + ownership check
    return this.contactsService.findOne(id, (req as any).user.organizationId);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() updateContactDto: UpdateContactDto,
    @Req() req: Request,
  ) {
    // Application-level tenant enforcement + ownership check
    return this.contactsService.update(
      id,
      updateContactDto,
      (req as any).user.organizationId,
    );
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: Request) {
    // Application-level tenant enforcement + ownership check
    return this.contactsService.remove(id, (req as any).user.organizationId);
  }
}
