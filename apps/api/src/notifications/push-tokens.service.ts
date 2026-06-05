import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PushTokensService {
  private readonly logger = new Logger(PushTokensService.name);

  constructor(private prisma: PrismaService) {}

  private isExpoPushToken(token: string) {
    return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
  }

  async register(userId: string, token: string) {
    if (!this.isExpoPushToken(token)) {
      this.logger.warn(
        `Rejected invalid Expo push token for user ${userId}: ${token?.slice(0, 24) ?? "missing"}`,
      );
      return false;
    }

    try {
      await this.prisma.pushToken.upsert({
        where: { token },
        update: { userId },
        create: { userId, token },
      });
      this.logger.log(
        `Registered Expo push token ${token.slice(0, 18)}... for user ${userId}`,
      );
      return true;
    } catch (err: any) {
      this.logger.error(
        `Failed to register Expo push token for user ${userId}: ${err.message}`,
      );
      return false;
    }
  }

  async getTokens(userId: string): Promise<string[]> {
    const records = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return records.map((r) => r.token);
  }

  async getAllTokens(): Promise<string[]> {
    const records = await this.prisma.pushToken.findMany({
      select: { token: true },
    });
    return records.map((r) => r.token);
  }

  async removeToken(token: string) {
    await this.prisma.pushToken.deleteMany({
      where: { token },
    });
  }
}
