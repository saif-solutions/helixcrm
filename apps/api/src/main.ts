import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe, ClassSerializerInterceptor } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ==================== ESSENTIAL MIDDLEWARE ====================
  // 1. Cookie parser MUST come first
  app.use(cookieParser());
  
  // 2. Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // ==================== CRITICAL: GLOBAL VALIDATION PIPE ====================
  // This MUST be set up exactly like this
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Remove properties without decorators
    forbidNonWhitelisted: true, // Throw error if unknown properties
    transform: true, // Auto-transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true,
    },
    stopAtFirstError: true, // Return on first validation error
  }));

  // ==================== GLOBAL INTERCEPTORS ====================
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ==================== CORS ====================
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-ID"],
  });

  // ==================== GLOBAL PREFIX ====================
  app.setGlobalPrefix('api/v1');

  // ==================== START SERVER ====================
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Server running on: ${await app.getUrl()}`);
  console.log(`📡 API: ${await app.getUrl()}/api/v1`);
  console.log(`✅ Global ValidationPipe: ACTIVE`);
  console.log(`🔒 Security: ACTIVE`);
  console.log(`🌐 CORS: Enabled for ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
}

bootstrap().catch((error) => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});