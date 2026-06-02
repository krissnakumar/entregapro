import { Module } from "@nestjs/common";
import { ClusteringService } from "./clustering.service";
import { ClusteringController } from "./clustering.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ClusteringController],
  providers: [ClusteringService],
  exports: [ClusteringService],
})
export class ClusteringModule {}
