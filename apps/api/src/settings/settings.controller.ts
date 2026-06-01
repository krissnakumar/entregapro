import { Body, Controller, Get, Param, Put, UseGuards, Req } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getAll(@Req() req: any) {
    const isSuperAdmin = req.user?.role === Role.SUPER_ADMIN;
    return this.settingsService.getAll(isSuperAdmin ? undefined : req.user?.organizationId);
  }

  @Put(":key")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  set(@Param("key") key: string, @Body() body: any, @Req() req: any) {
    const isSuperAdmin = req.user?.role === Role.SUPER_ADMIN;
    return this.settingsService.set(key, body.value, isSuperAdmin ? undefined : req.user?.organizationId);
  }
}
