import { 
  Controller, 
  Get, 
  UseGuards,
  Req,
  Request,
} from "@nestjs/common";
import { AuthGuard } from "../../shared/guards/auth.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { PermissionGuard } from "../../shared/guards/permission.guard";
import { RequirePermission } from "../../shared/decorators/require-permission.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @RequirePermission(['leads.read', 'contacts.read', 'deals.read'])
  async getStats(@Req() req: Request) {
    return this.dashboardService.getStats((req as any).user.organizationId);
  }
}