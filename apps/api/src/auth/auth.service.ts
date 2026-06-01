import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { PrismaService } from "../prisma/prisma.service";
import * as argon2 from "argon2";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (
      user &&
      user.active_status &&
      (await argon2.verify(user.password_hash, pass))
    ) {
      const { password_hash, refreshToken, ...result } = user;

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() },
      });

      return result;
    }
    return null;
  }

  async login(user: any) {
    const roleName = user.role?.name || "DRIVER";
    const permissions =
      user.role?.permissions?.map((p: any) => p.permission.key) || [];

    const organizationId = user.organizationId;

    const payload = {
      email: user.email,
      sub: user.id,
      role: roleName,
      permissions,
      organizationId,
    };
    const tokens = await this.getTokens(
      payload.sub,
      payload.email,
      payload.role,
      payload.permissions,
      payload.organizationId,
    );
    await this.updateRefreshToken(payload.sub, tokens.refresh_token);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: roleName,
        permissions,
        organizationId,
        active_status: user.active_status,
      },
    };
  }

  async logout(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user || !user.refreshToken || !user.active_status)
      throw new ForbiddenException("Access Denied");

    const refreshTokenMatches = await argon2.verify(
      user.refreshToken,
      refreshToken,
    );
    if (!refreshTokenMatches) throw new ForbiddenException("Access Denied");

    const roleName = user.role?.name || "DRIVER";
    const permissions =
      user.role?.permissions?.map((p: any) => p.permission.key) || [];

    const tokens = await this.getTokens(
      user.id,
      user.email,
      roleName,
      permissions,
      user.organizationId,
    );
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOne(email);
    if (!user) {
      // Don't reveal whether the email exists
      return {
        success: true,
        message: "If an account exists with this email, a reset link has been sent.",
      };
    }

    // Generate a password reset token (valid for 1 hour)
    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: 'password_reset' },
      {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        expiresIn: '1h',
      },
    );

    // In production, send email with reset link
    // For now, log the token
    console.log(`[ForgotPassword] Reset token for ${email}: ${resetToken}`);

    return {
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const ok = await argon2.verify(user.password_hash, oldPassword);
    if (!ok) {
      throw new UnauthorizedException("Current password is invalid");
    }

    const password_hash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });

    return { success: true };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }

  async getTokens(
    userId: string,
    email: string,
    role: string,
    permissions: string[],
    organizationId: string,
  ) {
    const payload = { sub: userId, email, role, permissions, organizationId };
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        expiresIn: "15m",
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
        expiresIn: "7d",
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }
}
