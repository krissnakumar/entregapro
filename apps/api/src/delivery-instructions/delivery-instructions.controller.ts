import { Controller, Get, Post, Body, Param, Req, UseGuards } from "@nestjs/common";
import { DeliveryInstructionsService } from "./delivery-instructions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("delivery-instructions")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryInstructionsController {
  constructor(private readonly service: DeliveryInstructionsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  upsert(@Body() body: any, @Req() req: any) {
    return this.service.upsert({ ...body, organizationId: req.user.organizationId });
  }

  @Get("delivery/:deliveryId")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  findByDelivery(@Param("deliveryId") deliveryId: string, @Req() req: any) {
    return this.service.findByDelivery(deliveryId, req.user.organizationId);
  }
}
