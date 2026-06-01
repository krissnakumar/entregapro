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
} from "@nestjs/common";
import { DeliveriesService } from "./deliveries.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { OrderStatus } from "@prisma/client";

@Controller("deliveries")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  @RequirePermissions("VIEW_ASSIGNED_TASKS", "MONITOR_OPERATIONS")
  findAll(@Request() req: any) {
    if (req.user.role === Role.DRIVER) {
      return this.deliveriesService.findForDriver(req.user.userId, req.user.organizationId);
    }
    return this.deliveriesService.findAll(req.user.organizationId);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  findOne(@Param("id") id: string) {
    return this.deliveriesService.findOne(id);
  }

  @Patch(":id/status")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  @RequirePermissions("UPDATE_DELIVERY_STATUS")
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: OrderStatus,
    @Request() req: any,
    @Body("notes") notes?: string,
  ) {
    return this.deliveriesService.updateStatus(id, status, {
      notes,
      userId: req.user.userId,
    });
  }

  @Patch(":id/proof")
  @Roles(Role.DRIVER)
  @RequirePermissions("UPLOAD_POD")
  uploadProof(@Param("id") id: string, @Body("image") image: string) {
    return this.deliveriesService.uploadProof(id, image);
  }

  @Post(":id/smart-assign")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("ASSIGN_DRIVER")
  smartAssign(@Param("id") id: string) {
    return this.deliveriesService.smartAssign(id);
  }

  @Post(":id/calculate-costs")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  calculateCosts(@Param("id") id: string) {
    return this.deliveriesService.calculateCosts(id);
  }
}
