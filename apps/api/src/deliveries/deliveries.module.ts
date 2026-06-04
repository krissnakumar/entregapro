import { Module } from "@nestjs/common";
import { DeliveriesService } from "./deliveries.service";
import { DeliveriesController } from "./deliveries.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DeliveryTimelineModule } from "../delivery-timeline/delivery-timeline.module";

@Module({
  imports: [PrismaModule, NotificationsModule, DeliveryTimelineModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
