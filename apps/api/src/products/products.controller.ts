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
import { ProductsService } from "./products.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

@Controller("products")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions("MONITOR_OPERATIONS")
  findAll(
    @Req() req: any,
    @Query("take", new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("brand") brand?: string,
    @Query("qualityGrade") qualityGrade?: string,
    @Query("active") active?: string,
  ) {
    return this.productsService.findAll(req.user.organizationId, {
      take,
      skip,
      category,
      search,
      brand,
      qualityGrade,
      active: active !== undefined ? active === "true" : undefined,
    });
  }

  @Get("categories")
  @RequirePermissions("MONITOR_OPERATIONS")
  getCategories(@Req() req: any) {
    return this.productsService.getCategories(req.user.organizationId);
  }

  @Get("brands")
  @RequirePermissions("MONITOR_OPERATIONS")
  getBrands(@Req() req: any) {
    return this.productsService.getBrands(req.user.organizationId);
  }

  @Get("sku/:sku")
  @RequirePermissions("MONITOR_OPERATIONS")
  findBySku(@Param("sku") sku: string, @Req() req: any) {
    return this.productsService.findBySku(sku, req.user.organizationId);
  }

  @Get(":id")
  @RequirePermissions("MONITOR_OPERATIONS")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.productsService.findOne(id, req.user.organizationId);
  }

  @Post()
  @RequirePermissions("MANAGE_SETTINGS")
  create(@Body() data: any, @Req() req: any) {
    return this.productsService.create({
      ...data,
      organizationId: req.user.organizationId,
    });
  }

  @Patch(":id")
  @RequirePermissions("MANAGE_SETTINGS")
  update(@Param("id") id: string, @Body() data: any, @Req() req: any) {
    return this.productsService.update(id, req.user.organizationId, data);
  }

  @Delete(":id")
  @RequirePermissions("MANAGE_SETTINGS")
  remove(@Param("id") id: string, @Req() req: any) {
    return this.productsService.remove(id, req.user.organizationId);
  }
}
