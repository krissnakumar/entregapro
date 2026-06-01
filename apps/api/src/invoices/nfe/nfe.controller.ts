import {
  Controller, Post, Get, Param, UseGuards, UseInterceptors,
  UploadedFile, Req, Body, BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { NfeService } from "./nfe.service";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles, Role } from "../../auth/decorators/roles.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

@Controller("invoices/nfe")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class NfeController {
  constructor(
    private readonly nfeService: NfeService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("import")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MANAGE_INVOICES")
  @UseInterceptors(FileInterceptor("file"))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Body("deliveryId") deliveryId: string | undefined,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException("Arquivo XML obrigatório");
    if (!file.originalname.endsWith(".xml")) {
      throw new BadRequestException("Formato inválido. Envie um arquivo XML da NF-e");
    }
    return this.nfeService.importXml(file, req.user.organizationId, req.user.userId, deliveryId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("VIEW_INVOICES")
  async findAll(@Req() req: any) {
    return this.prisma.invoice.findMany({
      where: { organizationId: req.user.organizationId, deletedAt: null, accessKey: { not: null } },
      include: {
        items: true,
        delivery: { select: { deliveryNumber: true, customer: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("VIEW_INVOICES")
  async findOne(@Param("id") id: string, @Req() req: any) {
    return this.prisma.invoice.findFirst({
      where: { id, organizationId: req.user.organizationId, deletedAt: null },
      include: {
        items: true,
        delivery: { include: { customer: true, driver: { include: { user: true } } } },
      },
    });
  }

  @Post(":id/cancel")
  @Roles(Role.ADMIN)
  @RequirePermissions("MANAGE_INVOICES")
  async cancel(@Param("id") id: string, @Req() req: any) {
    return this.nfeService.cancelNfe(id, req.user.organizationId);
  }
}
