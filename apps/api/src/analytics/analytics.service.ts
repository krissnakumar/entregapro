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

  async getDashboardKPIs(organizationId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. totalDeliveriesToday
    const totalDeliveriesToday = await this.prisma.delivery.count({
      where: {
        organizationId,
        scheduledTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // 2. trucksOnRoute
    const trucksOnRoute = await this.prisma.delivery.count({
      where: {
        organizationId,
        status: "IN_TRANSIT",
      },
    });

    // 3. delayedDeliveries
    const delayedDeliveries = await this.prisma.delivery.count({
      where: {
        organizationId,
        scheduledTime: {
          lt: new Date(),
        },
        status: {
          notIn: ["DELIVERED", "CANCELLED", "FAILED"],
        },
      },
    });

    // 4. activeDrivers
    const activeDrivers = await this.prisma.driver.count({
      where: {
        organizationId,
        isOnline: true,
      },
    });

    // 5. completedDeliveries
    const completedDeliveries = await this.prisma.delivery.count({
      where: {
        organizationId,
        status: "DELIVERED",
        OR: [
          {
            completedAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          {
            completedAt: null,
            scheduledTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        ],
      },
    });

    // 6. revenueToday
    const invoicesToday = await this.prisma.invoice.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });
    const revenueToday = invoicesToday._sum.totalAmount || 0;

    // 7. fuelCostToday
    const fuelToday = await this.prisma.fuelLog.aggregate({
      where: {
        organizationId,
        status: "APPROVED",
        fillDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        totalCost: true,
      },
    });
    const fuelCostToday = fuelToday._sum.totalCost || 0;

    // 8. deliverySuccessRate
    const totalDeliveries = await this.prisma.delivery.count({
      where: { organizationId },
    });
    const successfulDeliveries = await this.prisma.delivery.count({
      where: {
        organizationId,
        status: "DELIVERED",
      },
    });
    const deliverySuccessRate =
      totalDeliveries > 0
        ? Math.round((successfulDeliveries / totalDeliveries) * 100)
        : 100;

    return {
      totalDeliveriesToday,
      trucksOnRoute,
      delayedDeliveries,
      activeDrivers,
      completedDeliveries,
      revenueToday,
      fuelCostToday,
      deliverySuccessRate,
    };
  }
}
