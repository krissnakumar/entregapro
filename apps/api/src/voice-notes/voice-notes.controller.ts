import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { VoiceNotesService } from "./voice-notes.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("voice-notes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceNotesController {
  constructor(private readonly service: VoiceNotesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  create(@Body() body: any, @Req() req: any) {
    return this.service.create({
      ...body,
      driverId: req.user.userId,
      organizationId: req.user.organizationId,
    });
  }

  @Get("delivery/:deliveryId")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  findByDelivery(@Param("deliveryId") deliveryId: string, @Req() req: any) {
    return this.service.findByDelivery(deliveryId, req.user.organizationId);
  }

  @Get("driver/:driverId")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  findByDriver(
    @Param("driverId") driverId: string,
    @Req() req: any,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
  ) {
    return this.service.findByDriver(
      driverId,
      req.user.organizationId,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 50,
    );
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.organizationId);
  }
}
