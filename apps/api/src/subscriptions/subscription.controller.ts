import { Controller, Get, Post, Body, UseGuards, Req } from "@nestjs/common";
import { SubscriptionService } from "./subscription.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("subscription")
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get("current")
  getCurrent(@Req() req: any) {
    return this.subscriptionService.getCurrentSubscription(
      req.user.organizationId,
    );
  }

  @Get("usage")
  getUsage(@Req() req: any) {
    return this.subscriptionService.getUsage(req.user.organizationId);
  }

  @Post("change-plan")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  changePlan(@Body("planSlug") planSlug: string, @Req() req: any) {
    return this.subscriptionService.changePlan(
      req.user.organizationId,
      planSlug,
    );
  }

  @Post("cancel")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  cancel(@Req() req: any) {
    return this.subscriptionService.cancelSubscription(req.user.organizationId);
  }
}
