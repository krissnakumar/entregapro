import { Module } from "@nestjs/common";
import { MapsService } from "./maps.service";
import { MapsController } from "./maps.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
