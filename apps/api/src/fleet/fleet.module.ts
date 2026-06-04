import { Module } from "@nestjs/common";
import { FleetController } from "./fleet.controller";
import { FleetService } from "./fleet.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [FleetController],
  providers: [FleetService],
})
export class FleetModule {}
