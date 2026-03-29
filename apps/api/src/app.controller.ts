import { Controller, Get, Req, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { Request } from 'express';
import { Public } from './shared/decorators/require-permission.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

// Helper to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

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

  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Root endpoint' })
  @ApiResponse({ status: 200, description: 'Returns welcome message' })
  getHello(): string {
    return this.appService.getHello();
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
    const environment = this.configService.get<string>(
      'app.environment',
      'development',
    );

    if (environment === 'production') {
      this.logger.warn('Debug routes endpoint accessed in production');
      return {
        message: 'Debug endpoint not available in production',
        totalRoutes: 0,
        routes: [],
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        environment,
      };
    }

    try {
      const app = req.app as { _router?: { stack: RouterLayer[] } };
      const router = app._router;
      if (!router?.stack) {
        this.logger.warn('Router stack not available');
        return {
          message: 'Router stack not available',
          totalRoutes: 0,
          routes: [],
          baseUrl: req.baseUrl,
          originalUrl: req.originalUrl,
          environment,
        };
      }

      const routes = router.stack
        .filter(
          (
            layer,
          ): layer is RouterLayer & {
            route: NonNullable<RouterLayer['route']>;
          } => !!layer.route,
        )
        .map((layer) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods)
            .filter((method) => layer.route.methods[method])
            .map((method) => method.toUpperCase()),
        }));

      this.logger.debug(
        `Debug routes endpoint accessed, found ${routes.length} routes`,
      );
      return {
        message: 'Registered Routes',
        totalRoutes: routes.length,
        routes,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        environment,
      };
    } catch (error) {
      this.logger.error(`Failed to extract routes: ${getErrorMessage(error)}`);
      return {
        message: 'Failed to extract routes',
        totalRoutes: 0,
        routes: [],
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        environment,
      };
    }
  }
}
