import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PushTokensService {
  constructor(private prisma: PrismaService) {}

  private isExpoPushToken(token: string) {
    return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
  }

  async register(userId: string, token: string) {
    if (!this.isExpoPushToken(token)) {
      return false;
    }

    try {
      await this.prisma.pushToken.upsert({
        where: { token },
        update: { userId },
        create: { userId, token },
      });
      return true;
    } catch (err) {
      // Silently ignore or log if there is a constraint/race condition
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
