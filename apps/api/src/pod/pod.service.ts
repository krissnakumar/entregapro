import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class PodService {
  private readonly logger = new Logger(PodService.name);

  constructor(private prisma: PrismaService) {}

  async savePod(
    deliveryId: string,
    organizationId: string,
    userId: string,
    data: {
      signatureUrl?: string;
      photoUrl?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    this.logger.log(`Saving POD for delivery ${deliveryId}`);

    const driver = await this.prisma.driver.findFirst({
      where: { userId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) {
      throw new NotFoundException("Driver not found");
    }

    const delivery = await this.prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        organizationId,
        driverId: driver.id,
        deletedAt: null,
      },
      select: { id: true, status: true },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    if (delivery.status === OrderStatus.DELIVERED) {
      throw new ConflictException(
        `Delivery ${deliveryId} is already completed`,
      );
    }

    const res = await this.prisma.delivery.updateMany({
      where: {
        id: deliveryId,
        organizationId,
        driverId: driver.id,
        deletedAt: null,
      },
      data: {
        signature_url: data.signatureUrl,
        proof_image_url: data.photoUrl,
        pod_latitude: data.lat,
        pod_longitude: data.lng,
        pod_timestamp: new Date(),
        status: OrderStatus.DELIVERED,
        completedAt: new Date(),
      },
    });
    if (res.count === 0) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }
    return { success: true };
  }
}
