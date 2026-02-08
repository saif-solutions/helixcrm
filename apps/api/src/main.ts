import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {
  ValidationPipe,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { ConfigValidationService } from './config/config-validation.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ==================== LOGGING MIDDLEWARE REGISTRATION ====================
  logger.log('� Registering middleware...');

  // ==================== ESSENTIAL MIDDLEWARE ====================
  // 1. Cookie parser MUST come first
  app.use(cookieParser());
  logger.log('✅ Cookie parser registered');

  // 2. Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  logger.log('✅ Security headers (Helmet) registered');

  // ==================== CRITICAL: GLOBAL VALIDATION PIPE ====================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: true,
    }),
  );
  logger.log('✅ Global ValidationPipe registered');

  // ==================== GLOBAL INTERCEPTORS ====================
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  logger.log('✅ Global ClassSerializerInterceptor registered');

  // ==================== API VERSIONING ====================
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  logger.log('✅ API versioning enabled (v1)');

  // ==================== CORS ====================
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'x-csrf-token',
    ],
  });
  logger.log(`✅ CORS enabled for ${corsOrigin}`);

  // ==================== APPLICATION INITIALIZATION ====================
  await app.init();
  logger.log('✅ Application initialized');

  // ==================== CONFIGURATION VALIDATION (RUNS AFTER APP INIT) ====================
  logger.log('� Running configuration validation...');
  try {
    const configValidationService = app.get(ConfigValidationService);
    if (
      configValidationService &&
      typeof configValidationService.validate === 'function'
    ) {
      const validationResult = await configValidationService.validate();

      if (!validationResult.isValid) {
        logger.error(
          '❌ Configuration validation failed. Application cannot start.',
        );
        validationResult.errors.forEach((error) =>
          logger.error(`  - ${error}`),
        );
        process.exit(1);
      }

      if (validationResult.warnings.length > 0) {
        logger.warn('⚠️  Configuration validation warnings:');
        validationResult.warnings.forEach((warning) =>
          logger.warn(`  - ${warning}`),
        );
      }

      logger.log('✅ Configuration validation passed');
    } else {
      logger.warn(
        '⚠️  ConfigValidationService not found. Skipping configuration validation.',
      );
    }
  } catch (error) {
    logger.error(`❌ Configuration validation error: ${error.message}`);
    logger.error(
      '⚠️  Continuing without configuration validation (unsafe for production)',
    );
  }

  // ==================== DEBUG: LOG ALL REGISTERED ROUTES ====================
  // This helps verify that all modules are loaded correctly
  if (process.env.NODE_ENV === 'development') {
    const server = app.getHttpServer();
    const router = server._events.request._router;

    if (router && router.stack) {
      const routes = router.stack
        .map((layer) => {
          if (layer.route) {
            const path = layer.route?.path;
            const method = layer.route?.stack[0]?.method;
            return method ? `${method.toUpperCase()} ${path}` : null;
          }
          return null;
        })
        .filter(
          (route) => route !== null && route.includes('/api/v1/analytics'),
        );

      if (routes.length > 0) {
        logger.log(`� Registered ${routes.length} analytics routes:`);
        routes.forEach((route) => logger.log(`  ${route}`));
      } else {
        logger.warn('⚠️ No analytics routes found in router stack');
      }
    }
  }

  // ==================== START SERVER ====================
  const port = process.env.PORT || 3001;
  await app.listen(port);

  const url = await app.getUrl();
  logger.log(`� Server running on: ${url}`);
  logger.log(`� API: ${url}/api/v1`);
  logger.log(`✅ Global ValidationPipe: ACTIVE`);
  logger.log(`� Security: ACTIVE`);
  logger.log(`� CORS: Enabled for ${corsOrigin}`);
  logger.log(`� Environment: ${process.env.NODE_ENV || 'development'}`);

  // Log analytics module status
  if (
    process.env.REDIS_HOST &&
    process.env.ANALYTICS_EXPORT_ENABLED !== 'false'
  ) {
    logger.log(
      `� Analytics: Enabled with Redis exports (host: ${process.env.REDIS_HOST})`,
    );
  } else {
    logger.log(`� Analytics: Enabled (read-only, exports disabled)`);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});
