import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PodService {
  private readonly logger = new Logger(PodService.name);

  constructor(private prisma: PrismaService) {}

  async savePod(deliveryId: string, data: { signatureUrl?: string; photoUrl?: string; lat?: number; lng?: number }) {
    this.logger.log(`Saving POD for delivery ${deliveryId}`);

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, status: true },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    if (delivery.status === OrderStatus.DELIVERED) {
      throw new ConflictException(`Delivery ${deliveryId} is already completed`);
    }

    return this.prisma.delivery.update({
      where: { id: deliveryId },
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
  }
}
