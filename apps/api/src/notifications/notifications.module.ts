import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { PushTokensService } from "./push-tokens.service";
import { TrackingModule } from "../tracking/tracking.module";
import { BullModule } from "@nestjs/bullmq";
import { NotificationProcessor } from "../queues/processors/notification.processor";

@Module({
  imports: [
    TrackingModule,
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationProcessor, PushTokensService],
  exports: [NotificationsService, PushTokensService],
})
export class NotificationsModule {}
