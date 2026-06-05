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
    return this.notificationsService.findAll(
      req.user.userId,
      req.user.organizationId,
    );
  }

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  create(
    @Body() body: { userId: string; title: string; message: string },
    @Req() req: any,
  ) {
    return this.notificationsService.create(
      body.userId,
      body.title,
      body.message,
      req.user.organizationId,
    );
  }

  @Patch(":id/read")
  markAsRead(@Param("id") id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(
      id,
      req.user.userId,
      req.user.organizationId,
    );
  }

  @Patch("read-all")
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(
      req.user.userId,
      req.user.organizationId,
    );
  }

  @Post("push-token")
  async registerPushToken(@Req() req: any, @Body() body: { token: string }) {
    const success = await this.pushTokensService.register(
      req.user.userId,
      body.token,
    );
    return { success };
  }

  @Post("test-push")
  async sendTestPush(@Req() req: any) {
    const notification = await this.notificationsService.sendTestPush(
      req.user.userId,
      req.user.organizationId,
      req.user.name,
    );
    return { success: true, notificationId: notification.id };
  }
}
