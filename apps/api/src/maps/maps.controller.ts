import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { MapsService } from "./maps.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("maps")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get("zones")
  findAllZones(@Req() req: any) {
    return this.mapsService.findAllZones(req.user.organizationId);
  }

  @Post("zones")
  createZone(@Body() data: any, @Req() req: any) {
    return this.mapsService.createZone({
      ...data,
      organizationId: req.user.organizationId,
    });
  }

  @Delete("zones/:id")
  removeZone(@Param("id") id: string) {
    return this.mapsService.removeZone(id);
  }
}
