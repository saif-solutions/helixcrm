import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { LeadsService } from "./leads.service";
import { LeadsController } from "./leads.controller";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { LoggingModule } from "../../shared/logging/logging.module";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";

@Module({
  imports: [
    PrismaModule,
    LoggingModule,
    // Add JWT import for AuthGuard dependency
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    AuthGuard,
    TenantGuard,
  ],
  exports: [LeadsService],
})
export class LeadsModule {}