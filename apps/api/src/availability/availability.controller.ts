import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { AvailabilityService } from "./availability.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("availability")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get("delivery/:deliveryId")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  findByDelivery(@Param("deliveryId") deliveryId: string, @Req() req: any) {
    return this.service.findByDelivery(deliveryId, req.user.organizationId);
  }

  @Get("unavailable")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  findUnavailable(@Req() req: any, @Query("since") since?: string) {
    return this.service.findUnavailable(
      req.user.organizationId,
      since ? new Date(since) : undefined,
    );
  }

  @Get("stats")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  getStats(@Req() req: any) {
    return this.service.getStats(req.user.organizationId);
  }
}
