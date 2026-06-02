import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

@Controller("customers")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermissions("MANAGE_CUSTOMERS")
  create(@Body() data: any, @Req() req: any) {
    return this.customersService.create({
      ...data,
      organizationId: req.user.organizationId,
    });
  }

  @Get()
  @RequirePermissions("MONITOR_OPERATIONS")
  findAll(
    @Req() req: any,
    @Query("take", new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.customersService.findAll(req.user.organizationId, {
      take,
      skip,
    });
  }

  @Get(":id")
  @RequirePermissions("MONITOR_OPERATIONS")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.customersService.findOne(id, req.user.organizationId);
  }

  @Patch(":id")
  @RequirePermissions("MANAGE_CUSTOMERS")
  update(@Param("id") id: string, @Body() data: any, @Req() req: any) {
    return this.customersService.update(id, req.user.organizationId, data);
  }

  @Delete(":id")
  @RequirePermissions("MANAGE_CUSTOMERS")
  remove(@Param("id") id: string, @Req() req: any) {
    return this.customersService.remove(id, req.user.organizationId);
  }
}
