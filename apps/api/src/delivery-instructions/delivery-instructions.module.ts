import { Module } from "@nestjs/common";
import { DeliveryInstructionsService } from "./delivery-instructions.service";
import { DeliveryInstructionsController } from "./delivery-instructions.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryInstructionsController],
  providers: [DeliveryInstructionsService],
  exports: [DeliveryInstructionsService],
})
export class DeliveryInstructionsModule {}
