import { Module } from "@nestjs/common";
import { TrackingGateway } from "./tracking.gateway";
import { TrackingProcessor } from "./tracking.service";
import { PublicTrackingController } from "./public/public-tracking.controller";
import { PublicTrackingService } from "./public/public-tracking.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      signOptions: { expiresIn: "1h" },
    }),
  ],
  controllers: [PublicTrackingController],
  providers: [TrackingGateway, TrackingProcessor, PublicTrackingService],
  exports: [TrackingGateway],
})
export class TrackingModule {}
