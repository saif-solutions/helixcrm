// apps/api/src/modules/dashboard/dashboard.controller.ts
import { 
  Controller, 
  Get, 
  UseGuards,
  Req,
  Request,
  Logger,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { PermissionGuard } from "../../shared/guards/permission.guard";
import { RequirePermission } from "../../shared/decorators/require-permission.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @HttpCode(HttpStatus.OK)
  @RequirePermission('dashboard.read')
  async getStats(@Req() req: Request) {
    try {
      const userId = (req as any).user.sub;
      
      this.logger.log(`Fetching dashboard stats`, {
        userId,
        event: 'dashboard_stats_request'
      });
      
      const stats = await this.dashboardService.getStats();
      
      // Safely extract stats for logging
      let dealsCount = 0;
      let contactsCount = 0;
      let leadsCount = 0;
      
      // Handle different possible return structures
      if (stats && typeof stats === 'object') {
        // Check if stats has a 'data' property
        if ('data' in stats && stats.data && typeof stats.data === 'object') {
          const data = stats.data as any;
          // Check if data has a 'summary' property
          if ('summary' in data && data.summary && typeof data.summary === 'object') {
            const summary = data.summary as any;
            dealsCount = summary.deals || 0;
            contactsCount = summary.contacts || 0;
            leadsCount = summary.leads || 0;
          }
          // Alternatively, check if properties are at the root of data
          else if ('deals' in data) {
            dealsCount = typeof data.deals === 'number' ? data.deals : 0;
          }
          if ('contacts' in data) {
            contactsCount = typeof data.contacts === 'number' ? data.contacts : 0;
          }
          if ('leads' in data) {
            leadsCount = typeof data.leads === 'number' ? data.leads : 0;
          }
        }
        // Check if stats has properties directly
        else {
          if ('deals' in stats) {
            dealsCount = typeof (stats as any).deals === 'number' ? (stats as any).deals : 0;
          }
          if ('contacts' in stats) {
            contactsCount = typeof (stats as any).contacts === 'number' ? (stats as any).contacts : 0;
          }
          if ('leads' in stats) {
            leadsCount = typeof (stats as any).leads === 'number' ? (stats as any).leads : 0;
          }
        }
      }
      
      this.logger.debug(`Dashboard stats retrieved`, {
        userId,
        dealsCount,
        contactsCount,
        leadsCount,
      });
      
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch dashboard stats: ${error.message}`, error.stack, {
        userId: (req as any).user?.sub,
        event: 'dashboard_stats_error'
      });
      
      throw error;
    }
  }

  @Get("health")
  @HttpCode(HttpStatus.OK)
  @RequirePermission('dashboard.read')
  async getDashboardHealth(@Req() req: Request) {
    try {
      // Try to get basic stats as health check
      const stats = await this.dashboardService.getStats();
      
      const health = {
        status: stats ? 'healthy' : 'degraded',
        lastUpdated: new Date().toISOString(),
        components: {
          database: stats ? 'connected' : 'error',
          statsService: stats ? 'operational' : 'error',
        },
        dataFreshness: new Date().toISOString(),
      };
      
      return {
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    } catch (error) {
      this.logger.error(`Dashboard health check failed: ${error.message}`, {
        error: error.name,
        event: 'dashboard_health_error'
      });
      
      // Return degraded health status
      return {
        success: false,
        data: {
          status: 'degraded',
          components: {
            database: 'error',
            statsService: 'error',
          },
          lastUpdated: new Date().toISOString(),
          error: error.message,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}