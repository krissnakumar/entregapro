import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("performance")
  getPerformance(@Req() req: any) {
    return this.analyticsService.getGlobalPerformance(req.user.organizationId);
  }

  @Get("leaderboard")
  getLeaderboard(@Req() req: any) {
    return this.analyticsService.getDriverLeaderboard(req.user.organizationId);
  }

  @Get()
  getKPIs(@Req() req: any) {
    return this.analyticsService.getDashboardKPIs(req.user.organizationId);
  }
}
