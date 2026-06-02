import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, Query, ParseIntPipe, DefaultValuePipe } from "@nestjs/common";
import { VehiclesService } from "./vehicles.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

@Controller("vehicles")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @RequirePermissions("MANAGE_VEHICLES")
  create(@Body() data: any, @Req() req: any) {
    return this.vehiclesService.create({
      ...data,
      organizationId: req.user.organizationId,
    });
  }

  @Get()
  @RequirePermissions("MONITOR_OPERATIONS")
  async findAll(
    @Req() req: any,
    @Query("take", new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    const result = await this.vehiclesService.findAll(req.user.organizationId, { take, skip });
    return {
      ...result,
      data: result.data.map((v) => ({
        ...v,
        status: v.activeStatus ? "active" : "maintenance",
      })),
    };
  }

  @Get(":id")
  @RequirePermissions("MONITOR_OPERATIONS")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.vehiclesService.findOne(id, req.user.organizationId);
  }

  @Patch(":id")
  @RequirePermissions("MANAGE_VEHICLES")
  async update(@Param("id") id: string, @Body() data: any, @Req() req: any) {
    const updated = await this.vehiclesService.update(id, req.user.organizationId, data);
    return {
      ...updated,
      status: updated.activeStatus ? "active" : "maintenance",
    };
  }

  @Delete(":id")
  @RequirePermissions("MANAGE_VEHICLES")
  remove(@Param("id") id: string, @Req() req: any) {
    return this.vehiclesService.remove(id, req.user.organizationId);
  }
}
