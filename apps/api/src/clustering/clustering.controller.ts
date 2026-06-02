import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ClusteringService } from "./clustering.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("clustering")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClusteringController {
  constructor(private readonly service: ClusteringService) {}

  @Post("run")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  run(@Req() req: any) {
    return this.service.cluster(req.user.organizationId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  getClusters(@Req() req: any) {
    return this.service.getClusters(req.user.organizationId);
  }
}
