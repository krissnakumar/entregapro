import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { SimulationService } from "./simulation.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles, Role } from "../../auth/decorators/roles.decorator";

@Controller("dispatch/simulate")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get("routes")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  routes(@Req() req: any) {
    return this.simulationService.getRoutes(
      req.headers.authorization?.replace("Bearer ", ""),
    );
  }
}
