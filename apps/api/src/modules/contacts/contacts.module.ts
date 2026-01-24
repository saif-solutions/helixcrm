import { Module } from "@nestjs/common";
import { ContactsService } from "./contacts.service";
import { ContactsController } from "./contacts.controller";
import { LoggingModule } from "../../shared/logging/logging.module";

@Module({
  imports: [
    LoggingModule,
    // REMOVE: PrismaModule (now global via SecurityModule)
    // REMOVE: AuthModule (no longer needed for JwtService)
  ],
  controllers: [ContactsController],
  providers: [
    ContactsService,
  ],
  exports: [ContactsService],
})
export class ContactsModule {}