import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { LoggingModule } from "./shared/logging/logging.module";
import { RequestLoggerInterceptor } from "./shared/logging/request-logger.interceptor";
import { AuthThrottlerGuard } from "./shared/guards/auth-throttler.guard";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    ContactsModule,
    LoggingModule, // Added LoggingModule
    // Add other modules here as they are created
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthThrottlerGuard,
    },
  ],
})
export class AppModule {}
