import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from 'helmet';
import cookieParser from 'cookie-parser'; // Default import
import { GlobalExceptionFilter } from "./shared/exceptions/global-exception.filter";
import { NotFoundExceptionFilter } from "./shared/exceptions/not-found-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { 
    logger: ['error', 'warn', 'log', 'debug', 'verbose']
  });

  // ==================== COOKIE PARSER ====================
  // Must come before other middleware (including CSRF)
  app.use(cookieParser());

  // ==================== SECURITY HEADERS ====================
  // Apply Helmet security headers with safe defaults
  app.use(helmet({
    // Configure CSP to allow our own scripts
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for simplicity
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for CSRF
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    
    // Enable other security headers
    crossOriginEmbedderPolicy: false, // Disable for development
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // ==================== GLOBAL EXCEPTION FILTERS ====================
  // Apply global exception filters (order matters!)
  app.useGlobalFilters(
    new NotFoundExceptionFilter(),
    new GlobalExceptionFilter()
  );

  // ==================== CORS CONFIGURATION ====================
  // Enable CORS for frontend development
  app.enableCors({
    origin: "http://localhost:5173", // Vite default port
    credentials: true, // IMPORTANT: Allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "Accept", 
      "X-Organization-Id", 
      "X-Request-ID",
      "X-CSRF-Token" // Allow CSRF token header
    ],
    exposedHeaders: ["X-Request-ID"],
  });

  // ==================== GLOBAL PREFIX ====================
  // Add API version prefix (Phase 1 requirement)
  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Ì∫Ä Application is running on: ${await app.getUrl()}`);
  console.log(`Ì≥ù API Base URL: ${await app.getUrl()}/api/v1`);
  console.log(`Ì¥í Security headers: Enabled (Helmet.js)`);
  console.log(`ÌΩ™ Cookie parser: Enabled (httpOnly cookies)`);
  console.log(`Ìª°Ô∏è  CSRF protection: Enabled`);
  console.log(`‚ö†Ô∏è  Global exception filters: Enabled`);
  console.log(`Ì¥Ñ Request context middleware: Enabled`);
  console.log(`Ì¥ë Cryptographically strong request IDs: Enabled`);
}
bootstrap();
