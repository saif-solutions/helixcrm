import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ContactsService } from "./contacts.service";
import { ContactsController } from "./contacts.controller";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { LoggingModule } from "../../shared/logging/logging.module";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";

@Module({
  imports: [
    PrismaModule,
    LoggingModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [ContactsController],
  providers: [
    ContactsService,
    AuthGuard,
    TenantGuard,
  ],
  exports: [ContactsService],
})
export class ContactsModule {}
