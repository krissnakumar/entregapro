import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { OrganizationService } from "../organizations/organization.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RefreshTokenGuard } from "./guards/refresh-token.guard";
import { Public } from "./decorators/public.decorator";
import { BypassTenant } from "../organizations/guards/tenant.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private organizationService: OrganizationService,
    private prisma: PrismaService,
  ) {}

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: any) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.authService.login(user);
  }

  @Post("register")
  @Public()
  async register(@Body() body: any) {
    const { orgName, orgSlug, name, email, password } = body;
    if (!orgName || !orgSlug || !name || !email || !password) {
      throw new BadRequestException("Missing required fields: orgName, orgSlug, name, email, password");
    }

    const org = await this.organizationService.create({
      name: orgName,
      slug: orgSlug,
    });

    // Ensure global permissions exist
    const permissionKeys = [
      "MANAGE_USERS", "MANAGE_ROLES", "MANAGE_SETTINGS", "VIEW_ANALYTICS",
      "VIEW_AUDIT_LOGS", "MANAGE_WHATSAPP", "CREATE_DELIVERY", "ASSIGN_DRIVER",
      "TRACK_DELIVERY", "MONITOR_OPERATIONS", "MANAGE_CUSTOMERS", "MANAGE_VEHICLES",
      "MANAGE_ZONES", "OPTIMIZE_DISPATCH", "VIEW_ASSIGNED_TASKS", "UPDATE_DELIVERY_STATUS",
      "EXECUTE_DELIVERY", "UPLOAD_POD", "SHARE_GPS_LIVE", "VIEW_INVOICES",
      "MANAGE_INVOICES", "VIEW_FINANCIALS", "MANAGE_SUBSCRIPTION", "MANAGE_FLEET",
    ];
    const existingPerms = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    const existingKeys = new Set(existingPerms.map((p) => p.key));
    const missingKeys = permissionKeys.filter((k) => !existingKeys.has(k));
    if (missingKeys.length > 0) {
      await this.prisma.permission.createMany({
        data: missingKeys.map((key) => ({
          key,
          description: key.replace(/_/g, " ").toLowerCase(),
        })),
      });
      const created = await this.prisma.permission.findMany({
        where: { key: { in: missingKeys } },
      });
      existingPerms.push(...created);
    }
    const allPermissions = existingPerms;

    // Create default roles for the organization
    const excludedFromDispatcher = new Set([
      "MANAGE_USERS", "MANAGE_ROLES", "MANAGE_SETTINGS", "MANAGE_SUBSCRIPTION", "VIEW_AUDIT_LOGS",
    ]);
    const driverOnlyKeys = new Set([
      "VIEW_ASSIGNED_TASKS", "UPDATE_DELIVERY_STATUS", "EXECUTE_DELIVERY", "UPLOAD_POD", "SHARE_GPS_LIVE",
    ]);

    const roleDefs = [
      { name: "ADMIN", filter: () => true },
      { name: "DISPATCHER", filter: (p: { key: string }) => !excludedFromDispatcher.has(p.key) },
      { name: "DRIVER", filter: (p: { key: string }) => driverOnlyKeys.has(p.key) },
    ];
    await this.prisma.role.createMany({
      data: roleDefs.map((r) => ({ name: r.name, organizationId: org.id })),
    });
    const createdRoles = await this.prisma.role.findMany({
      where: { organizationId: org.id },
    });
    for (const role of createdRoles) {
      const roleDef = roleDefs.find((r) => r.name === role.name)!;
      const rolePerms = allPermissions.filter(roleDef.filter);
      if (rolePerms.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: rolePerms.map((p) => ({ role_id: role.id, permission_id: p.id })),
        });
      }
    }

    const adminRole = await this.prisma.role.findFirst({
      where: { name: "ADMIN", organizationId: org.id },
    });

    const user = await this.usersService.create({
      name,
      email,
      password: password,
      role: "ADMIN",
      organizationId: org.id,
      role_id: adminRole?.id,
    });

    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @BypassTenant()
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.userId);
  }

  @UseGuards(RefreshTokenGuard)
  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Req() req: any) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Post("forgot-password")
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body("email") email: string) {
    return this.authService.forgotPassword(email);
  }

  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  @BypassTenant()
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: any, @Body() body: any) {
    return this.authService.changePassword(
      req.user.userId,
      body.oldPassword,
      body.newPassword,
    );
  }
}
