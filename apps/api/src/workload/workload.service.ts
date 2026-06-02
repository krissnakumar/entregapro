import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WorkloadService {
  private readonly logger = new Logger(WorkloadService.name);
  private readonly MAX_DAILY_DELIVERIES = 30;
  private readonly MAX_DAILY_WEIGHT_KG = 5000;
  private readonly MAX_WORK_HOURS = 10;

  constructor(private prisma: PrismaService) {}

  async calculateWorkload(driverId: string, organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeDeliveries = await this.prisma.delivery.findMany({
      where: {
        driverId,
        organizationId,
        deletedAt: null,
        status: { in: ["ASSIGNED", "LOADED", "IN_TRANSIT", "ARRIVED"] },
      },
      include: {
        invoices: { select: { weight: true, volume: true } },
      },
    });

    const totalWeight = activeDeliveries.reduce(
      (sum, d) => sum + d.invoices.reduce((s, i) => s + (i.weight || 0), 0),
      0,
    );
    const totalVolume = activeDeliveries.reduce(
      (sum, d) => sum + d.invoices.reduce((s, i) => s + (i.volume || 0), 0),
      0,
    );

    const totalKm = activeDeliveries.reduce((sum, d) => sum + (d.total_km || 0), 0);
    const avgSpeed = 40;
    const stopTimePerDelivery = 15;
    const totalDurationMin =
      (totalKm / avgSpeed) * 60 + activeDeliveries.length * stopTimePerDelivery;

    const estimatedEnd = new Date();
    estimatedEnd.setMinutes(estimatedEnd.getMinutes() + totalDurationMin);

    const warnings: string[] = [];
    if (activeDeliveries.length > this.MAX_DAILY_DELIVERIES) {
      warnings.push(`Motorista excedeu limite de ${this.MAX_DAILY_DELIVERIES} entregas/dia`);
    }
    if (totalWeight > this.MAX_DAILY_WEIGHT_KG) {
      warnings.push(`Peso total (${totalWeight}kg) excede limite de ${this.MAX_DAILY_WEIGHT_KG}kg`);
    }
    if (totalDurationMin > this.MAX_WORK_HOURS * 60) {
      warnings.push(`Jornada estimada (${Math.round(totalDurationMin / 60)}h) excede ${this.MAX_WORK_HOURS}h`);
    }

    const workloadScore = Math.min(
      100,
      (activeDeliveries.length / this.MAX_DAILY_DELIVERIES) * 40 +
        (totalWeight / this.MAX_DAILY_WEIGHT_KG) * 30 +
        (totalDurationMin / (this.MAX_WORK_HOURS * 60)) * 30,
    );

    const metric = await this.prisma.driverWorkloadMetric.upsert({
      where: {
        driverId_date: { driverId, date: today },
      },
      create: {
        driverId,
        date: today,
        totalDeliveries: activeDeliveries.length,
        totalWeight,
        totalVolume,
        totalDistanceKm: totalKm,
        totalDurationMin,
        currentLoad: activeDeliveries.length,
        estimatedEndTime: estimatedEnd,
        workloadScore,
        warnings,
        organizationId,
      },
      update: {
        totalDeliveries: activeDeliveries.length,
        totalWeight,
        totalVolume,
        totalDistanceKm: totalKm,
        totalDurationMin,
        currentLoad: activeDeliveries.length,
        estimatedEndTime: estimatedEnd,
        workloadScore,
        warnings,
      },
    });

    return {
      ...metric,
      isOverloaded: workloadScore > 70,
      suggestedReduction: Math.max(0, activeDeliveries.length - Math.floor(this.MAX_DAILY_DELIVERIES * 0.7)),
      warnings,
    };
  }

  async getAllWorkloads(organizationId: string) {
    const drivers = await this.prisma.driver.findMany({
      where: { organizationId, deletedAt: null, isOnline: true },
      select: { id: true },
    });

    const workloads = await Promise.all(
      drivers.map((d) =>
        this.calculateWorkload(d.id, organizationId).catch(() => null),
      ),
    );

    return workloads.filter(Boolean);
  }

  async getAlertCandidates(organizationId: string) {
    const workloads = await this.getAllWorkloads(organizationId);
    return workloads
      .filter((w: any) => w.isOverloaded)
      .sort((a: any, b: any) => b.workloadScore - a.workloadScore);
  }
}
