import { Body, Controller, Get, Post, Query, UseGuards, Req } from "@nestjs/common";
import { FleetService } from "./fleet.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller()
@UseGuards(JwtAuthGuard)
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get("fuel-logs")
  findFuelLogs(@Req() req: any, @Query("vehicleId") vehicleId?: string) {
    return this.fleetService.findFuelLogs(vehicleId, req.user.organizationId);
  }

  @Post("fuel-logs")
  createFuelLog(@Req() req: any, @Body() data: any) {
    return this.fleetService.createFuelLog({
      ...data,
      organizationId: req.user.organizationId,
    });
  }

  @Get("maintenance-logs")
  findMaintenanceLogs(@Req() req: any, @Query("vehicleId") vehicleId?: string) {
    return this.fleetService.findMaintenanceLogs(vehicleId, req.user.organizationId);
  }

  @Post("maintenance-logs")
  createMaintenanceLog(@Req() req: any, @Body() data: any) {
    return this.fleetService.createMaintenanceLog({
      ...data,
      organizationId: req.user.organizationId,
    });
  }
}
