import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { RoutesService } from "./routes.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

@Controller("routes")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("OPTIMIZE_DISPATCH")
  create(
    @Body()
    body: {
      name?: string;
      driverId?: string;
      vehicleId?: string;
      stopIds: string[];
    },
    @Req() req: any,
  ) {
    return this.routesService.create({
      ...body,
      organizationId: req.user.organizationId,
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MONITOR_OPERATIONS")
  findAll(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("driverId") driverId?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
  ) {
    return this.routesService.findAll(req.user.organizationId, {
      status,
      driverId,
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 50,
    });
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  @RequirePermissions("MONITOR_OPERATIONS")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.routesService.findOne(id, req.user.organizationId);
  }

  @Patch(":id/status")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("OPTIMIZE_DISPATCH")
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @Req() req: any,
  ) {
    return this.routesService.updateStatus(id, req.user.organizationId, status);
  }

  @Post(":id/optimize")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("OPTIMIZE_DISPATCH")
  optimizeRoute(@Param("id") id: string, @Req() req: any) {
    return this.routesService.optimizeRoute(id, req.user.organizationId);
  }

  @Patch("stops/:stopId")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  @RequirePermissions("MONITOR_OPERATIONS")
  updateStop(
    @Param("stopId") stopId: string,
    @Body()
    body: {
      status?: string;
      actualArrival?: string;
      actualDeparture?: string;
      notes?: string;
    },
    @Req() req: any,
  ) {
    return this.routesService.updateStopStatus(
      stopId,
      req.user.organizationId,
      {
        ...body,
        actualArrival: body.actualArrival
          ? new Date(body.actualArrival)
          : undefined,
        actualDeparture: body.actualDeparture
          ? new Date(body.actualDeparture)
          : undefined,
      },
    );
  }

  @Post(":id/costs")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("OPTIMIZE_DISPATCH")
  addCost(
    @Param("id") id: string,
    @Body()
    body: {
      fuelCost?: number;
      tollCost?: number;
      driverCost?: number;
      maintenanceCost?: number;
    },
    @Req() req: any,
  ) {
    return this.routesService.addCost(id, req.user.organizationId, body);
  }
}
