import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { LoadBatchService } from "./load-batch.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { DeliveryStatus } from "@prisma/client";

@Controller("load-batches")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class LoadBatchController {
  constructor(private readonly loadBatchService: LoadBatchService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("ASSIGN_DRIVER")
  create(@Request() req: any, @Body() body: {
    driverId?: string;
    vehicleId?: string;
    deliveryIds: string[];
    totalWeight?: number;
    totalVolume?: number;
    routeDistanceKm?: number;
    estimatedDurationMinutes?: number;
  }) {
    return this.loadBatchService.create({
      ...body,
      organizationId: req.user.organizationId,
      dispatcherId: req.user.userId,
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MONITOR_OPERATIONS")
  findAll(
    @Request() req: any,
    @Query("take", new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query("status") status?: DeliveryStatus,
  ) {
    return this.loadBatchService.findByOrganization(req.user.organizationId, {
      take,
      skip,
      status,
    });
  }

  @Get("my-loads")
  @Roles(Role.DRIVER)
  @RequirePermissions("VIEW_ASSIGNED_TASKS")
  findMyLoads(@Request() req: any) {
    return this.loadBatchService.findByDriver(
      req.user.userId,
      req.user.organizationId,
    );
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.loadBatchService.findOne(id, req.user.organizationId);
  }

  @Patch(":id/approve")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("ASSIGN_DRIVER")
  approve(@Param("id") id: string, @Request() req: any) {
    return this.loadBatchService.approve(id, req.user.userId, req.user.organizationId);
  }

  @Patch(":id/reject")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("ASSIGN_DRIVER")
  reject(@Param("id") id: string, @Request() req: any, @Body("reason") reason?: string) {
    return this.loadBatchService.reject(id, req.user.userId, req.user.organizationId, reason);
  }

  @Patch(":id/reassign")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("ASSIGN_DRIVER")
  reassign(@Param("id") id: string, @Request() req: any, @Body() body: {
    driverId: string;
    vehicleId: string;
  }) {
    return this.loadBatchService.reassignDriver(
      id,
      body.driverId,
      body.vehicleId,
      req.user.userId,
      req.user.organizationId,
    );
  }

  @Patch(":id/accept")
  @Roles(Role.DRIVER)
  @RequirePermissions("VIEW_ASSIGNED_TASKS")
  acceptByDriver(@Param("id") id: string, @Request() req: any) {
    return this.loadBatchService.acceptByDriver(
      id,
      req.user.userId,
      req.user.organizationId,
    );
  }

  @Patch(":id/start-loading")
  @Roles(Role.DRIVER)
  @RequirePermissions("UPDATE_DELIVERY_STATUS")
  startLoading(@Param("id") id: string, @Request() req: any) {
    return this.loadBatchService.startLoading(
      id,
      req.user.userId,
      req.user.organizationId,
    );
  }

  @Patch(":id/mark-loaded")
  @Roles(Role.DRIVER)
  @RequirePermissions("UPDATE_DELIVERY_STATUS")
  markLoaded(@Param("id") id: string, @Request() req: any) {
    return this.loadBatchService.markLoaded(
      id,
      req.user.userId,
      req.user.organizationId,
    );
  }

  @Patch(":id/start-route")
  @Roles(Role.DRIVER)
  @RequirePermissions("UPDATE_DELIVERY_STATUS")
  startRoute(@Param("id") id: string, @Request() req: any) {
    return this.loadBatchService.startRoute(
      id,
      req.user.userId,
      req.user.organizationId,
    );
  }

  @Patch(":id/complete")
  @Roles(Role.DRIVER)
  @RequirePermissions("EXECUTE_DELIVERY")
  completeBatch(@Param("id") id: string, @Request() req: any) {
    return this.loadBatchService.completeBatch(
      id,
      req.user.userId,
      req.user.organizationId,
    );
  }
}
