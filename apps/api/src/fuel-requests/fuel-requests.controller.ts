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
import { FuelRequestService } from "./fuel-requests.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { FuelRequestStatus } from "@prisma/client";

@Controller("fuel-requests")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class FuelRequestController {
  constructor(private readonly fuelRequestService: FuelRequestService) {}

  @Post()
  @Roles(Role.DRIVER)
  @RequirePermissions("VIEW_ASSIGNED_TASKS")
  create(@Request() req: any, @Body() body: {
    vehicleId?: string;
    loadBatchId?: string;
    amountRequested?: number;
    fuelLiters?: number;
    fuelStation?: string;
    reason?: string;
  }) {
    return this.fuelRequestService.create(req.user.userId, {
      ...body,
      organizationId: req.user.organizationId,
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MONITOR_OPERATIONS")
  findAll(
    @Request() req: any,
    @Query("take", new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query("status") status?: FuelRequestStatus,
  ) {
    return this.fuelRequestService.findAll(req.user.organizationId, {
      take,
      skip,
      status,
    });
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.fuelRequestService.findOne(id, req.user.organizationId);
  }

  @Patch(":id/approve")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MONITOR_OPERATIONS")
  approve(@Param("id") id: string, @Request() req: any, @Body() body: {
    approvedAmount?: number;
    fuelLiters?: number;
    fuelStation?: string;
    note?: string;
  }) {
    return this.fuelRequestService.approve(
      id,
      req.user.userId,
      req.user.organizationId,
      body,
    );
  }

  @Patch(":id/reject")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MONITOR_OPERATIONS")
  reject(@Param("id") id: string, @Request() req: any, @Body("reason") reason?: string) {
    return this.fuelRequestService.reject(
      id,
      req.user.userId,
      req.user.organizationId,
      reason,
    );
  }

  @Patch(":id/receipt")
  @Roles(Role.DRIVER)
  @RequirePermissions("VIEW_ASSIGNED_TASKS")
  uploadReceipt(@Param("id") id: string, @Request() req: any, @Body("receiptPhotoUrl") receiptPhotoUrl: string) {
    return this.fuelRequestService.uploadReceipt(
      id,
      req.user.userId,
      req.user.organizationId,
      receiptPhotoUrl,
    );
  }
}
