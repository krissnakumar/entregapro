import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Processor("location-tracking")
export class TrackingProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackingProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { deliveryId, lat, lng, driverId, speed, heading, batteryLevel, organizationId } = job.data;

    try {
      // 1. Persist location ping
      await this.prisma.locationPing.create({
        data: {
          driverId,
          lat,
          lng,
          speed: speed ?? null,
          heading: heading ?? null,
          batteryLevel: batteryLevel ?? null,
          timestamp: new Date(),
          organizationId: organizationId || 'unknown',
        },
      });

      // 2. Update driver's live coordinates
      await this.prisma.driver.update({
        where: { id: driverId },
        data: {
          liveLatitude: lat,
          liveLongitude: lng,
          lastSeen: new Date(),
          isOnline: true,
        },
      });

      return { success: true, driverId, deliveryId };
    } catch (error) {
      this.logger.error(
        `Failed to persist location for driver ${driverId}: ${(error as Error).message}`,
      );
      // Don't throw — location persistence is fire-and-forget.
      // Throwing would cause BullMQ to retry, which is unnecessary here.
      return { success: false, driverId, error: (error as Error).message };
    }
  }
}
