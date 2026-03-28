import { Controller, Get, Req, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { Request } from 'express';
import { Public } from './shared/decorators/require-permission.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

// Define types for Express router layers
interface RouterLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
}

@ApiTags('App')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Root endpoint' })
  @ApiResponse({ status: 200, description: 'Returns welcome message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health(): { status: string; timestamp: string; service: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'HelixCRM API',
    };
  }

  @Get('debug-routes')
  @Public()
  @ApiOperation({
    summary: 'Debug: Get all registered routes (development only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of registered routes',
  })
  getRoutes(@Req() req: Request): {
    message: string;
    totalRoutes: number;
    routes: Array<{ path: string; methods: string[] }>;
    baseUrl: string;
    originalUrl: string;
    environment: string;
  } {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn('Debug routes endpoint accessed in production');
      return {
        message: 'Debug endpoint not available in production',
        totalRoutes: 0,
        routes: [],
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        environment: process.env.NODE_ENV,
      };
    }

    // Type-safe access to Express router - removed unnecessary assertions
    const app = req.app as { _router?: { stack: RouterLayer[] } };
    const router = app._router;

    if (!router || !router.stack) {
      this.logger.warn('Router stack not available');
      return {
        message: 'Router stack not available',
        totalRoutes: 0,
        routes: [],
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        environment: process.env.NODE_ENV,
      };
    }

    const routes = router.stack
      .filter((layer: RouterLayer) => layer.route)
      .map((layer: RouterLayer) => {
        const route = layer.route;
        // Removed unnecessary non-null assertions
        const path = route.path;
        const methods = Object.keys(route.methods)
          .filter((method) => route.methods[method])
          .map((method) => method.toUpperCase());

        return { path, methods };
      });

    this.logger.debug(
      `Debug routes endpoint accessed, found ${routes.length} routes`,
    );

    return {
      message: 'Registered Routes',
      totalRoutes: routes.length,
      routes,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      environment: process.env.NODE_ENV,
    };
  }
}
