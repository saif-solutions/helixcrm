import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from "@nestjs/common";
import { VersioningType } from "@nestjs/common";

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ==================== LOGGING MIDDLEWARE REGISTRATION ====================
  logger.log('📦 Registering middleware...');

  // ==================== ESSENTIAL MIDDLEWARE ====================
  // 1. Cookie parser MUST come first
  app.use(cookieParser());
  logger.log('✅ Cookie parser registered');
  
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
  logger.log('✅ Security headers (Helmet) registered');

  // ==================== CRITICAL: GLOBAL VALIDATION PIPE ====================
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    stopAtFirstError: true,
  }));
  logger.log('✅ Global ValidationPipe registered');

  // ==================== GLOBAL INTERCEPTORS ====================
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  logger.log('✅ Global interceptors registered');

  // ==================== CORS ====================
  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-ID"],
  });
  logger.log(`✅ CORS enabled for origin: ${corsOrigin}`);

  // ==================== GLOBAL PREFIX ====================
  // ⚠️ IMPORTANT: This must be set BEFORE app.init() in tests
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  logger.log(`✅ Global prefix set to: /${globalPrefix}`);
  // ==================== API VERSIONING ====================
  app.enableVersioning({ type: VersioningType.URI });
  logger.log("✅ URI versioning enabled");

  // ==================== APPLICATION INITIALIZATION ====================
  // Initialize the application (triggers module registration)
  await app.init();
  logger.log('✅ Application initialized');

  // ==================== ROUTE DEBUGGING ====================
  // Log analytics routes for debugging
  const server = app.getHttpServer();
  if (server._events?.request?._router?.stack) {
    const router = server._events.request._router;
    const analyticsRoutes = [];
    
    router.stack.forEach(layer => {
      if (layer.route && layer.route.path && layer.route.path.includes('analytics')) {
        analyticsRoutes.push({
          method: layer.route.stack[0]?.method?.toUpperCase() || 'UNKNOWN',
          path: layer.route.path
        });
      }
    });
    
    if (analyticsRoutes.length > 0) {
      logger.log(`📊 Registered ${analyticsRoutes.length} analytics routes:`);
      analyticsRoutes.forEach(route => {
        logger.log(`  ${route.method} ${route.path}`);
      });
    } else {
      logger.warn('⚠️ No analytics routes found in router stack');
    }
  }

  // ==================== START SERVER ====================
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  const url = await app.getUrl();
  logger.log(`🚀 Server running on: ${url}`);
  logger.log(`📡 API: ${url}/api/v1`);
  logger.log(`✅ Global ValidationPipe: ACTIVE`);
  logger.log(`🔒 Security: ACTIVE`);
  logger.log(`🌐 CORS: Enabled for ${corsOrigin}`);
  logger.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log analytics module status
  if (process.env.REDIS_HOST && process.env.ANALYTICS_EXPORT_ENABLED !== 'false') {
    logger.log(`📊 Analytics: Enabled with Redis exports (host: ${process.env.REDIS_HOST})`);
  } else {
    logger.log(`📊 Analytics: Enabled (read-only, exports disabled)`);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});