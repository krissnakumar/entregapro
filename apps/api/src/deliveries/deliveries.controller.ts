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
  ParseIntPipe,
  DefaultValuePipe,
  ValidationPipe,
} from "@nestjs/common";
import { DeliveriesService } from "./deliveries.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { OrderStatus, DeliveryStatus } from "@prisma/client";

@Controller("deliveries")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  @RequirePermissions("VIEW_ASSIGNED_TASKS", "MONITOR_OPERATIONS")
  findAll(
    @Request() req: any,
    @Query("take", new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query("status") status?: OrderStatus,
    @Query("deliveryStatus") deliveryStatus?: DeliveryStatus,
  ) {
    if (req.user.role === Role.DRIVER) {
      return this.deliveriesService.findForDriver(
        req.user.userId,
        req.user.organizationId,
      );
    }
    return this.deliveriesService.findAll(req.user.organizationId, {
      take,
      skip,
      status,
      deliveryStatus,
    });
  }

  @Get("my-deliveries")
  @Roles(Role.DRIVER)
  @RequirePermissions("VIEW_ASSIGNED_TASKS")
  findMyDeliveries(@Request() req: any) {
    return this.deliveriesService.findForDriver(
      req.user.userId,
      req.user.organizationId,
    );
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  findOne(@Param("id") id: string, @Request() req: any) {
    return this.deliveriesService.findOne(id, req.user.organizationId);
  }

  @Get(":id/timeline")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  getTimeline(@Param("id") id: string, @Request() req: any) {
    return this.deliveriesService.getDeliveryTimeline(id, req.user.organizationId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("CREATE_DELIVERY")
  create(
    @Request() req: any,
    @Body() body: {
      customerName: string;
      customerPhone?: string;
      deliveryAddress: string;
      invoiceNumber?: string;
      productName?: string;
      quantity?: number;
      weight?: number;
      volume?: number;
      deliveryDate?: string;
      priority?: number;
      notes?: string;
      vehicleType?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    return this.deliveriesService.create(req.user.organizationId, {
      ...body,
      createdByAdminId: req.user.userId,
    });
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
    return this.deliveriesService.updateStatus(
      id,
      req.user.organizationId,
      status,
      {
        notes,
        userId: req.user.userId,
      },
    );
  }

  @Patch(":id/delivery-status")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  @RequirePermissions("UPDATE_DELIVERY_STATUS")
  updateDeliveryStatus(
    @Param("id") id: string,
    @Body("deliveryStatus") deliveryStatus: DeliveryStatus,
    @Request() req: any,
    @Body("notes") notes?: string,
    @Body("failureReason") failureReason?: string,
    @Body("lat") lat?: number,
    @Body("lng") lng?: number,
  ) {
    return this.deliveriesService.updateDeliveryStatus(
      id,
      req.user.organizationId,
      deliveryStatus,
      {
        notes,
        failureReason,
        actorId: req.user.userId,
        actorRole: req.user.role,
        lat,
        lng,
      },
    );
  }

  @Patch(":id/proof")
  @Roles(Role.DRIVER)
  @RequirePermissions("UPLOAD_POD")
  uploadProof(
    @Param("id") id: string,
    @Body("image") image: string,
    @Request() req: any,
  ) {
    return this.deliveriesService.uploadProof(
      id,
      req.user.organizationId,
      image,
    );
  }

  @Patch(":id/failed")
  @Roles(Role.DRIVER)
  @RequirePermissions("UPDATE_DELIVERY_STATUS")
  markFailed(
    @Param("id") id: string,
    @Request() req: any,
    @Body() body: {
      reason: string;
      notes?: string;
      photoUrl?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    return this.deliveriesService.markFailed(id, req.user.organizationId, {
      ...body,
      actorId: req.user.userId,
    });
  }

  @Post(":id/smart-assign")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("ASSIGN_DRIVER")
  smartAssign(@Param("id") id: string, @Request() req: any) {
    return this.deliveriesService.smartAssign(id, req.user.organizationId);
  }

  @Post(":id/calculate-costs")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  calculateCosts(@Param("id") id: string, @Request() req: any) {
    return this.deliveriesService.calculateCosts(id, req.user.organizationId);
  }

  @Patch(":id/assign")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("ASSIGN_DRIVER")
  assignResources(
    @Param("id") id: string,
    @Request() req: any,
    @Body() body: {
      driverId?: string;
      vehicleId?: string;
    },
  ) {
    return this.deliveriesService.assignResources(id, req.user.organizationId, {
      ...body,
      dispatcherId: req.user.userId,
    });
  }
}
