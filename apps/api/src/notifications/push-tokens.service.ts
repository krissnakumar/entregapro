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

  async sendPushNotificationDirectly(data: {
    userId: string;
    notificationId: string;
    title: string;
    message: string;
  }) {
    const tokens = await this.getTokens(data.userId);
    if (tokens.length === 0) {
      this.logger.debug(
        `No push tokens for user ${data.userId}, skipping push`,
      );
      return;
    }

    const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

    for (const token of tokens) {
      try {
        const response = await fetch(EXPO_PUSH_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            to: token,
            title: data.title,
            body: data.message,
            data: { notificationId: data.notificationId },
            sound: "default",
            priority: "high",
          }),
        });

        const responseBody = await response
          .json()
          .catch(() => null as any);

        if (!response.ok) {
          this.logger.warn(
            `Expo push failed for token ${token.slice(0, 10)}...: ${response.status}`,
          );
          continue;
        }

        const tickets = Array.isArray(responseBody?.data)
          ? responseBody.data
          : responseBody?.data
            ? [responseBody.data]
            : [];

        if (tickets.length === 0) {
          this.logger.warn(
            `Expo push returned no ticket for token ${token.slice(0, 10)}...`,
          );
          continue;
        }

        for (const ticket of tickets) {
          if (ticket.status !== "error") {
            continue;
          }

          this.logger.warn(
            `Expo push ticket error for token ${token.slice(0, 10)}...: ${ticket.details?.error ?? ticket.message ?? "unknown error"}`,
          );

          const detail = ticket.details?.error;
          const msg = ticket.message?.toLowerCase() ?? "";
          const isPermanent =
            detail === "DeviceNotRegistered" ||
            msg.includes("not a valid expo push token");

          if (isPermanent) {
            await this.removeToken(token);
            this.logger.warn(
              `Removed invalid Expo push token ${token.slice(0, 10)}...`,
            );
          }
        }
      } catch (err: any) {
        this.logger.error(`Expo push error: ${err.message}`);
      }
    }
  }
}
