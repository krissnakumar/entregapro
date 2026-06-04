import { Module } from "@nestjs/common";
import { FuelRequestService } from "./fuel-requests.service";
import { FuelRequestController } from "./fuel-requests.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [FuelRequestController],
  providers: [FuelRequestService],
  exports: [FuelRequestService],
})
export class FuelRequestModule {}
