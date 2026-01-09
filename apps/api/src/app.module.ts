import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { LoggingModule } from "./shared/logging/logging.module";
import { RequestLoggerInterceptor } from "./shared/logging/request-logger.interceptor";

@Module({
  imports: [
    // Configuration module (loads .env files)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development'],
      expandVariables: true,
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'medium',
        ttl: 300000, // 5 minutes
        limit: 300, // 300 requests per 5 minutes
      },
      {
        name: 'auth',
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute for auth endpoints
      },
      {
        name: 'password-reset',
        ttl: 3600000, // 1 hour
        limit: 5, // 5 reset attempts per hour
      },
    ]),
    
    // Database
    PrismaModule,
    
    // Feature modules
    AuthModule,
ContactsModule,
    
    // Infrastructure modules
    LoggingModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    
    // Global request logging
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
  ],
})
export class AppModule {}