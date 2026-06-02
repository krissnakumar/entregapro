import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { DeliveryEventsService } from "./delivery-events.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("delivery-events")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryEventsController {
  constructor(private readonly service: DeliveryEventsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  create(@Body() body: any, @Req() req: any) {
    return this.service.create({ ...body, organizationId: req.user.organizationId });
  }

  @Get("delivery/:deliveryId")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  findByDelivery(@Param("deliveryId") deliveryId: string, @Req() req: any) {
    return this.service.findByDelivery(deliveryId, req.user.organizationId);
  }

  @Get("type/:type")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  findByType(
    @Param("type") type: string,
    @Req() req: any,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
  ) {
    return this.service.findByType(
      req.user.organizationId,
      type,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 50,
    );
  }

  @Get("recent")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  findRecent(@Req() req: any, @Query("minutes") minutes?: string) {
    return this.service.findRecent(req.user.organizationId, minutes ? parseInt(minutes) : 60);
  }
}
