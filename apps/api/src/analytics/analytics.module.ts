import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsController } from "./analytics.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [PrismaModule, ReportsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
