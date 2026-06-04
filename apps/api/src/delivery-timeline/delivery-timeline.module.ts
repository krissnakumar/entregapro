import { Module } from "@nestjs/common";
import { DeliveryTimelineService } from "./delivery-timeline.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [DeliveryTimelineService],
  exports: [DeliveryTimelineService],
})
export class DeliveryTimelineModule {}
