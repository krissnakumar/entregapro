import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { WorkloadService } from "./workload.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("workload")
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkloadController {
  constructor(private readonly service: WorkloadService) {}

  @Get("driver/:driverId")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  calculateWorkload(@Param("driverId") driverId: string, @Req() req: any) {
    return this.service.calculateWorkload(driverId, req.user.organizationId);
  }

  @Get("all")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  getAllWorkloads(@Req() req: any) {
    return this.service.getAllWorkloads(req.user.organizationId);
  }

  @Get("alerts")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  getAlertCandidates(@Req() req: any) {
    return this.service.getAlertCandidates(req.user.organizationId);
  }
}
