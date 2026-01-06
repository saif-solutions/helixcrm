import { Module } from "@nestjs/common";
import { ContactsService } from "./contacts.service";
import { ContactsController } from "./contacts.controller";
import { AuthModule } from "../auth/auth.module"; // Import AuthModule

@Module({
  imports: [AuthModule], // Add AuthModule import
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
