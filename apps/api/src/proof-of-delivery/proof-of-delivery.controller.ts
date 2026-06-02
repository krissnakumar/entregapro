import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ProofOfDeliveryService } from "./proof-of-delivery.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("proof-of-delivery")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProofOfDeliveryController {
  constructor(private readonly service: ProofOfDeliveryService) {}

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

  @Get("recent")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  findRecent(@Req() req: any, @Query("skip") skip?: string, @Query("take") take?: string) {
    return this.service.findRecent(
      req.user.organizationId,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 50,
    );
  }
}
