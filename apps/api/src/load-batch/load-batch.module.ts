import { Module } from "@nestjs/common";
import { LoadBatchService } from "./load-batch.service";
import { LoadBatchController } from "./load-batch.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DeliveryTimelineModule } from "../delivery-timeline/delivery-timeline.module";

@Module({
  imports: [PrismaModule, NotificationsModule, DeliveryTimelineModule],
  controllers: [LoadBatchController],
  providers: [LoadBatchService],
  exports: [LoadBatchService],
})
export class LoadBatchModule {}
