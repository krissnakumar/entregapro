import { Controller, Get, Param, NotFoundException, UseGuards } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(":id")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("VIEW_ASSIGNED_TASKS", "MONITOR_OPERATIONS")
  async findOne(@Param("id") id: string) {
    const order = await this.ordersService.findOne(id);
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    return order;
  }
}
