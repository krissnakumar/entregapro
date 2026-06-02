import { Module } from "@nestjs/common";
import { TrackingPublicService } from "./tracking-public.service";
import { TrackingPublicController } from "./tracking-public.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TrackingPublicController],
  providers: [TrackingPublicService],
  exports: [TrackingPublicService],
})
export class TrackingPublicModule {}
