import { Module } from "@nestjs/common";
import { DeliveryEventsService } from "./delivery-events.service";
import { DeliveryEventsController } from "./delivery-events.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryEventsController],
  providers: [DeliveryEventsService],
  exports: [DeliveryEventsService],
})
export class DeliveryEventsModule {}
