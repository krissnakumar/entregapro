import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAll(@Req() req: any) {
    const isSuperAdmin = req.user?.role === Role.SUPER_ADMIN;
    return this.usersService.findAll(
      isSuperAdmin ? undefined : req.user?.organizationId,
    );
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() data: any, @Req() req: any) {
    return this.usersService.create({
      ...data,
      organizationId: req.user?.organizationId,
    });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() data: any, @Req() req: any) {
    const isAdmin = req.user?.role === Role.ADMIN || req.user?.role === Role.SUPER_ADMIN;
    if (!isAdmin && req.user?.userId !== id) {
      throw new ForbiddenException("You can only update your own profile");
    }
    return this.usersService.update(id, {
      ...data,
      organizationId: req.user?.organizationId,
    });
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any) {
    const isAdmin = req.user?.role === Role.ADMIN || req.user?.role === Role.SUPER_ADMIN;
    if (!isAdmin && req.user?.userId !== id) {
      throw new ForbiddenException("You can only delete your own account");
    }
    return this.usersService.remove(id);
  }
}
