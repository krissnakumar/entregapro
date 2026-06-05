import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PushTokensService } from "../../notifications/push-tokens.service";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

interface PushJob {
  userId: string;
  notificationId: string;
  title: string;
  message: string;
}

interface ExpoPushTicket {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

@Processor("notifications")
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private pushTokensService: PushTokensService,
  ) {
    super();
  }

  async process(job: Job<PushJob>) {
    if (job.name === "send-push") {
      await this.sendPushNotification(job.data);
    }
  }

  private isPermanentTokenError(ticket: ExpoPushTicket) {
    const detail = ticket.details?.error;
    const message = ticket.message?.toLowerCase() ?? "";

    return (
      detail === "DeviceNotRegistered" ||
      message.includes("not a valid expo push token")
    );
  }

  private async sendPushNotification(data: PushJob) {
    const tokens = await this.pushTokensService.getTokens(data.userId);
    if (tokens.length === 0) {
      this.logger.debug(
        `No push tokens for user ${data.userId}, skipping push`,
      );
      return;
    }

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
          .catch(() => null as { data?: ExpoPushTicket[] | ExpoPushTicket } | null);

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

          if (this.isPermanentTokenError(ticket)) {
            await this.pushTokensService.removeToken(token);
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

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Notification job ${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, err: Error) {
    this.logger.error(`Notification job ${job.id} failed: ${err.message}`);
  }
}
