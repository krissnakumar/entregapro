import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  Req,
} from "@nestjs/common";
import type { Response } from "express";
import { CacheInterceptor, CacheKey, CacheTTL } from "@nestjs/cache-manager";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("daily")
  @RequirePermissions("MONITOR_OPERATIONS")
  @CacheTTL(60000)
  getDaily(@Req() req: any, @Query("date") date: string) {
    return this.reportsService.getDailyDeliveries(
      date || new Date().toISOString(),
      req.user.organizationId,
    );
  }

  @Get("drivers")
  @RequirePermissions("MONITOR_OPERATIONS")
  @CacheTTL(30000)
  getDrivers(@Req() req: any) {
    return this.reportsService.getDriverPerformance(req.user.organizationId);
  }

  @Get("vehicles")
  @RequirePermissions("MONITOR_OPERATIONS")
  @CacheTTL(30000)
  getVehicles(@Req() req: any) {
    return this.reportsService.getVehicleUtilization(req.user.organizationId);
  }

  @Get("delayed")
  @RequirePermissions("MONITOR_OPERATIONS")
  @CacheTTL(30000)
  getDelayed(@Req() req: any) {
    return this.reportsService.getDelayedDeliveries(req.user.organizationId);
  }

  @Get("weekly-stats")
  @RequirePermissions("VIEW_ANALYTICS")
  @CacheTTL(300000)
  getWeekly(@Req() req: any) {
    return this.reportsService.getWeeklyStats(req.user.organizationId);
  }

  @Get("executive")
  @RequirePermissions("VIEW_ANALYTICS")
  @CacheTTL(30000)
  getExecutive(@Req() req: any) {
    return this.reportsService.getExecutiveStats(req.user.organizationId);
  }

  @Get("financial")
  @RequirePermissions("VIEW_ANALYTICS")
  @CacheTTL(60000)
  getFinancial(@Req() req: any) {
    return this.reportsService.getFinancialReport(req.user.organizationId);
  }

  @Get("export/excel")
  @RequirePermissions("VIEW_ANALYTICS")
  @CacheTTL(0)
  async exportExcel(@Req() req: any, @Res() res: Response) {
    const buffer = await this.reportsService.generateExcel(
      req.user.organizationId,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=relatorio_${new Date().toISOString().split("T")[0]}.xlsx`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  }

  @Get("export/pdf")
  @RequirePermissions("VIEW_ANALYTICS")
  @CacheTTL(0)
  async exportPdf(@Req() req: any, @Res() res: Response) {
    const buffer = await this.reportsService.generatePdf(
      req.user.organizationId,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=relatorio_${new Date().toISOString().split("T")[0]}.pdf`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  }
}
