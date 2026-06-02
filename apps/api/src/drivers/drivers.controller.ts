import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards, Req, Query, ParseIntPipe, DefaultValuePipe } from "@nestjs/common";
import { DriversService } from "./drivers.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

@Controller("drivers")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @RequirePermissions("MONITOR_OPERATIONS")
  async findAll(
    @Req() req: any,
    @Query("take", new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    const result = await this.driversService.findAll(req.user.organizationId, { take, skip });
    return {
      ...result,
      data: result.data.map((d) => ({
        id: d.id,
        name: d.user.name,
        email: d.user.email,
        phone: d.phone,
        status: d.availabilityStatus ? "disponível" : "em_descanso",
        isOnline: d.isOnline,
        lastSeen: d.lastSeen,
        cnhNumber: d.licenseNumber,
        currentVehicle: d.vehicle
          ? {
              id: d.vehicle.id,
              vehicleNumber: d.vehicle.vehicleNumber,
              type: d.vehicle.type,
            }
          : null,
      })),
    };
  }

  @Get(":id")
  @RequirePermissions("MONITOR_OPERATIONS")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.driversService.findOne(id, req.user.organizationId);
  }

  @Post()
  @RequirePermissions("MANAGE_FLEET")
  async create(@Body() data: any, @Req() req: any) {
    const created = await this.driversService.create({
      ...data,
      organizationId: req.user.organizationId,
    });
    return {
      id: created.id,
      name: created.user.name,
      phone: created.phone,
      cnhNumber: created.licenseNumber,
      cnhCategory: data.cnhCategory || "E",
      cnhExpiration: data.cnhExpiration || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString().split("T")[0],
      status: "disponível",
      rating: 5,
      tripsCount: 0,
      currentVehicle: created.vehicle
        ? {
            id: created.vehicle.id,
            vehicleNumber: created.vehicle.vehicleNumber,
            type: created.vehicle.type,
          }
        : null,
    };
  }

  @Patch(":id")
  @RequirePermissions("MANAGE_FLEET")
  async update(@Param("id") id: string, @Body() data: any, @Req() req: any) {
    const updated = await this.driversService.update(id, req.user.organizationId, data);
    return {
      id: updated.id,
      name: updated.user?.name,
      phone: updated.phone,
      cnhNumber: updated.licenseNumber,
      cnhCategory: data.cnhCategory || "E",
      cnhExpiration: data.cnhExpiration || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString().split("T")[0],
      status: updated.availabilityStatus ? "disponível" : "em_descanso",
      currentVehicle: updated.vehicle
        ? {
            id: updated.vehicle.id,
            vehicleNumber: updated.vehicle.vehicleNumber,
            type: updated.vehicle.type,
          }
        : null,
    };
  }

  @Delete(":id")
  @RequirePermissions("MANAGE_FLEET")
  remove(@Param("id") id: string, @Req() req: any) {
    return this.driversService.remove(id, req.user.organizationId);
  }
}
