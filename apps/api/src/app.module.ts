import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
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
import { RequestContextMiddleware } from "./shared/middleware/request-context.middleware";
import { CsrfMiddleware } from "./shared/security/csrf.middleware";

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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply RequestContextMiddleware to ALL routes first
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // Apply CSRF middleware to ALL routes
    // The CsrfMiddleware itself handles which paths/methods to skip
    consumer
      .apply(CsrfMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}