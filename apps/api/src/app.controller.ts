import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { Request } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('debug-routes')
  getRoutes(@Req() req: Request): any {
    // This will show us what routes are actually registered
    const router = req.app._router;
    const routes = router.stack
      .map((layer) => {
        if (layer.route) {
          const path = layer.route?.path;
          const methods = Object.keys(layer.route?.methods || {})
            .filter((method) => layer.route?.methods[method])
            .map((method) => method.toUpperCase());
          return {
            path,
            methods,
          };
        }
        return null;
      })
      .filter((route) => route !== null);

    return {
      message: 'Registered Routes',
      totalRoutes: routes.length,
      routes: routes,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
    };
  }

  @Get('health')
  health(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
