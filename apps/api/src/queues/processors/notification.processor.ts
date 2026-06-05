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
      await this.pushTokensService.sendPushNotificationDirectly(job.data);
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
