import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { PushTokensService } from "./push-tokens.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushTokensService: PushTokensService,
  ) {}

  @Get()
  findAll(@Req() req: any) {
    return this.notificationsService.findAll(req.user.userId, req.user.organizationId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  create(@Body() body: { userId: string; title: string; message: string }, @Req() req: any) {
    return this.notificationsService.create(body.userId, body.title, body.message, req.user.organizationId);
  }

  @Patch(":id/read")
  markAsRead(@Param("id") id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch("read-all")
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Post("push-token")
  registerPushToken(
    @Req() req: any,
    @Body() body: { token: string },
  ) {
    this.pushTokensService.register(req.user.userId, body.token);
    return { success: true };
  }
}
