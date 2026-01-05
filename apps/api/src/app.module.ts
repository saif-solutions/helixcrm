import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { AppLogger } from "./shared/logging/logger.service";
import { RequestLoggerInterceptor } from "./shared/logging/request-logger.interceptor";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ContactsModule,
    // Add other modules here as they are created
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    AppLogger,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
  ],
})
export class AppModule {}
