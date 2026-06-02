import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  Req,
} from "@nestjs/common";
import { PodService } from "./pod.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { Public } from "../auth/decorators/public.decorator";

@Controller("pod")
export class PodController {
  constructor(
    private readonly podService: PodService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(":deliveryId")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.DRIVER)
  @RequirePermissions("UPLOAD_POD")
  async submitPod(
    @Param("deliveryId") deliveryId: string,
    @Body()
    data: {
      signatureUrl?: string;
      photoUrl?: string;
      lat?: number;
      lng?: number;
    },
    @Req() req: any,
  ) {
    return this.podService.savePod(
      deliveryId,
      req.user.organizationId,
      req.user.userId,
      data,
    );
  }

  @Get("public/:deliveryId")
  @Public()
  async getPod(@Param("deliveryId") deliveryId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, deletedAt: null },
      select: {
        id: true,
        deliveryNumber: true,
        proof_image_url: true,
        signature_url: true,
        pod_latitude: true,
        pod_longitude: true,
        pod_timestamp: true,
        status: true,
        completedAt: true,
      },
    });
    if (!delivery) throw new NotFoundException("Entrega não encontrada");
    return delivery;
  }
}
