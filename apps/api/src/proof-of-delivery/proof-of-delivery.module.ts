import { Module } from "@nestjs/common";
import { ProofOfDeliveryService } from "./proof-of-delivery.service";
import { ProofOfDeliveryController } from "./proof-of-delivery.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ProofOfDeliveryController],
  providers: [ProofOfDeliveryService],
  exports: [ProofOfDeliveryService],
})
export class ProofOfDeliveryModule {}
