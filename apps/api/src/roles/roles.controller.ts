import { Controller, Get, Param, UseGuards, Req } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("roles")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll(@Req() req: any) {
    const isSuperAdmin = req.user?.role === Role.SUPER_ADMIN;
    return this.rolesService.findAll(isSuperAdmin ? undefined : req.user?.organizationId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.rolesService.findOne(id);
  }
}
