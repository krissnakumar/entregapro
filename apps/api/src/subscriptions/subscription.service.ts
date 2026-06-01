import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getCurrentSubscription(organizationId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (!sub) {
      throw new NotFoundException("No subscription found for this organization");
    }
    return sub;
  }

  async changePlan(organizationId: string, planSlug: string) {
    const plan = await this.prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      throw new BadRequestException("Plan not found");
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!sub) {
      throw new NotFoundException("No active subscription");
    }

    if (sub.planId === plan.id) {
      return sub;
    }

    return this.prisma.subscription.update({
      where: { organizationId },
      data: {
        planId: plan.id,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: { plan: true },
    });
  }

  async cancelSubscription(organizationId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!sub) throw new NotFoundException("No active subscription");

    const graceEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this.prisma.subscription.update({
      where: { organizationId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        gracePeriodEndsAt: graceEnd,
      },
    });
  }

  async getUsage(organizationId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true, usageTrackings: true },
    });
    if (!sub) throw new NotFoundException("No active subscription");

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [deliveriesThisMonth, activeDrivers, activeDispatchers] = await Promise.all([
      this.prisma.delivery.count({
        where: {
          organizationId,
          createdAt: { gte: monthStart },
          deletedAt: null,
        },
      }),
      this.prisma.driver.count({
        where: {
          organizationId,
          availabilityStatus: true,
          deletedAt: null,
        },
      }),
      this.prisma.user.count({
        where: {
          organizationId,
          role: { name: "DISPATCHER", organizationId },
          active_status: true,
          deletedAt: null,
        },
      }),
    ]);

    return {
      plan: sub.plan,
      status: sub.status,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      usage: {
        deliveriesThisMonth,
        deliveriesLimit: sub.plan.maxDeliveriesPerMonth,
        deliveriesPercent: Math.round((deliveriesThisMonth / sub.plan.maxDeliveriesPerMonth) * 100),
        activeDrivers,
        driversLimit: sub.plan.maxDrivers,
        driversPercent: Math.round((activeDrivers / sub.plan.maxDrivers) * 100),
        activeDispatchers,
        dispatchersLimit: sub.plan.maxDispatchers,
        dispatchersPercent: Math.round((activeDispatchers / sub.plan.maxDispatchers) * 100),
      },
      features: {
        routeOptimization: sub.plan.hasRouteOptimization,
        liveTracking: sub.plan.hasLiveTracking,
        whatsApp: sub.plan.hasWhatsApp,
        customerPortal: sub.plan.hasCustomerPortal,
        analytics: sub.plan.hasAnalytics,
        constructionModule: sub.plan.hasConstructionModule,
      },
    };
  }

  async checkUsageLimit(organizationId: string, metric: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const usage = await this.getUsage(organizationId);
    const limits: Record<string, { current: number; limit: number }> = {
      deliveries: { current: usage.usage.deliveriesThisMonth, limit: usage.usage.deliveriesLimit },
      drivers: { current: usage.usage.activeDrivers, limit: usage.usage.driversLimit },
      dispatchers: { current: usage.usage.activeDispatchers, limit: usage.usage.dispatchersLimit },
    };

    const entry = limits[metric];
    if (!entry) return { allowed: true, current: 0, limit: 0 };

    const allowed = entry.current < entry.limit;
    return { allowed, current: entry.current, limit: entry.limit };
  }
}
