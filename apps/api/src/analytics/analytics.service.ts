import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getGlobalPerformance(organizationId: string) {
    const totalDeliveries = await this.prisma.delivery.count({
      where: { organizationId },
    });
    const completedDeliveries = await this.prisma.delivery.count({
      where: { status: "DELIVERED", organizationId },
    });

    const monthlyTotal = await this.prisma.delivery.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: true,
    });

    return {
      summary: {
        total: totalDeliveries,
        completed: completedDeliveries,
        efficiency:
          totalDeliveries > 0
            ? (completedDeliveries / totalDeliveries) * 100
            : 0,
      },
      breakdown: monthlyTotal,
    };
  }

  async getDriverLeaderboard(organizationId: string) {
    const performance = await this.prisma.driver.findMany({
      where: { organizationId },
      include: {
        user: { select: { name: true } },
        _count: {
          select: { deliveries: { where: { status: "DELIVERED" } } },
        },
      },
      orderBy: {
        deliveries: { _count: "desc" },
      } as any,
      take: 5,
    });

    return performance.map((p) => ({
      name: p.user.name,
      deliveries: p._count.deliveries,
    }));
  }
}
