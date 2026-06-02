import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DeliveryEventsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    deliveryId: string;
    type: string;
    description?: string;
    metadata?: any;
    latitude?: number;
    longitude?: number;
    photoUrl?: string;
    signatureUrl?: string;
    organizationId: string;
  }) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: data.deliveryId, organizationId: data.organizationId },
    });
    if (!delivery) throw new NotFoundException("Delivery not found");

    return this.prisma.deliveryEvent.create({ data });
  }

  async findByDelivery(deliveryId: string, organizationId: string) {
    return this.prisma.deliveryEvent.findMany({
      where: { deliveryId, organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByType(organizationId: string, type: string, skip = 0, take = 50) {
    const [data, total] = await Promise.all([
      this.prisma.deliveryEvent.findMany({
        where: { organizationId, type },
        orderBy: { createdAt: "desc" },
        skip,
        take: Math.min(take, 100),
        include: { delivery: { select: { id: true, deliveryNumber: true } } },
      }),
      this.prisma.deliveryEvent.count({ where: { organizationId, type } }),
    ]);
    return { data, total };
  }

  async findRecent(organizationId: string, minutes = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.prisma.deliveryEvent.findMany({
      where: { organizationId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
