import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  UseInterceptors,
  Query,
  Req,
} from "@nestjs/common";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { DispatchService } from "./dispatch.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { OrderStatus } from "@prisma/client";

@Controller("dispatch")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("CREATE_DELIVERY")
  create(@Body() createOrderDto: any, @Req() req: any) {
    return this.dispatchService.create({
      ...createOrderDto,
      dispatcherId: req.user.userId,
      organizationId: req.user.organizationId,
    });
  }

  @UseInterceptors(CacheInterceptor)
  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MONITOR_OPERATIONS")
  async findAll(@Req() req: any) {
    return this.dispatchService.findAll(req.user.organizationId);
  }

  @Patch(":id/assign")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("ASSIGN_DRIVER")
  assignDriver(
    @Param("id") id: string,
    @Body("driverId") driverId: string | null,
    @Req() req: any,
  ) {
    return this.dispatchService.assignDriver(id, driverId, req.user?.userId);
  }

  @Post("optimize")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("OPTIMIZE_DISPATCH")
  optimize(@Req() req: any) {
    return this.dispatchService.optimize(req.user.organizationId);
  }
}
