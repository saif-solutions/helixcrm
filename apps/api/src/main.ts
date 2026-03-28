import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Get configuration
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  const environment = configService.get<string>(
    'app.environment',
    'development',
  );
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');

  // Security middleware
  app.use(helmet());
  app.use(cookieParser());

  // Enable CORS
  const corsOrigin = configService.get<string[]>('app.cors.origin', [
    'http://localhost:5173',
  ]);
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Organization-Id',
    ],
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation (only in non-production)
  if (environment !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('HelixCRM API')
      .setDescription('HelixCRM REST API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Contacts', 'Contact management')
      .addTag('Deals', 'Deal management')
      .addTag('Leads', 'Lead management')
      .addTag('Pipelines', 'Pipeline management')
      .addTag('Dashboard', 'Dashboard statistics')
      .addTag('Analytics', 'Analytics and reporting')
      .addTag('Webhooks', 'Webhook management')
      .addTag('Health', 'Health checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log('Swagger documentation available at /docs');
  }

  // Start server
  await app.listen(port);
  logger.log(
    `��� Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(`��� Environment: ${environment}`);
  logger.log(`��� CORS enabled for: ${corsOrigin.join(', ')}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
