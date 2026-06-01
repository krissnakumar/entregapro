import { Module } from "@nestjs/common";
import { JobSitesController } from "./job-sites.controller";
import { JobSitesService } from "./job-sites.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [JobSitesController],
  providers: [JobSitesService],
  exports: [JobSitesService],
})
export class JobSitesModule {}
