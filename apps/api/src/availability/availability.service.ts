import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async findByDelivery(deliveryId: string, organizationId: string) {
    return this.prisma.deliveryAvailabilityResponse.findMany({
      where: { deliveryId, organizationId },
      orderBy: { responseTime: "desc" },
    });
  }

  async findUnavailable(organizationId: string, since?: Date) {
    const where: any = {
      organizationId,
      isAvailable: false,
    };
    if (since) where.responseTime = { gte: since };

    return this.prisma.deliveryAvailabilityResponse.findMany({
      where,
      orderBy: { responseTime: "desc" },
      include: {
        delivery: {
          select: {
            id: true,
            deliveryNumber: true,
            customer: { select: { name: true, phone: true } },
          },
        },
      },
    });
  }

  async getStats(organizationId: string) {
    const total = await this.prisma.deliveryAvailabilityResponse.count({
      where: { organizationId },
    });
    const available = await this.prisma.deliveryAvailabilityResponse.count({
      where: { organizationId, isAvailable: true },
    });

    return {
      total,
      available,
      unavailable: total - available,
      rate: total > 0 ? ((available / total) * 100).toFixed(1) : "0",
    };
  }
}
