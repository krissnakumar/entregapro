import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { GeoService } from "./geo.service";

@Global()
@Module({
  providers: [PrismaService, GeoService],
  exports: [PrismaService, GeoService],
})
export class PrismaModule {}
