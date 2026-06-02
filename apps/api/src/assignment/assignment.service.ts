import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AssignmentInput {
  invoiceIds: string[];
  driverId?: string;
  vehicleId?: string;
}

export interface AssignmentRecommendation {
  driverId: string;
  vehicleId: string;
  invoiceIds: string[];
  score: number;
  totalDistance: number;
  totalWeight: number;
  totalVolume: number;
  capacityUtilization: number;
  warnings: string[];
  reason: string;
}

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);
  private readonly AVG_SPEED_KMH = 40;
  private readonly STOP_TIME_MIN = 15;
  private readonly MAX_WORK_MINUTES = 600;
  private readonly MAX_DAILY_DELIVERIES = 30;

  constructor(private prisma: PrismaService) {}

  async runAssignment(organizationId: string) {
    // Step 1: Validate orders - get unassigned invoices with delivery data
    const invoices = await this.validateOrders(organizationId);
    if (invoices.length === 0) {
      return {
        message: "Nenhuma entrega pendente para alocar.",
        recommendations: [],
      };
    }

    // Step 2: Get available drivers with vehicles
    const drivers = await this.getAvailableDrivers(organizationId);
    if (drivers.length === 0) {
      return {
        message: "Nenhum motorista disponivel no momento.",
        recommendations: [],
      };
    }

    // Step 3: Group nearby deliveries by proximity
    const groups = this.groupByProximity(invoices, 5);

    // Step 4: Score each driver for each group
    const recommendations = await this.scoreAssignments(
      groups,
      drivers,
      organizationId,
    );

    // Step 5: Sort by score and save top recommendations
    recommendations.sort((a, b) => a.score - b.score);

    const saved: any[] = [];
    for (const rec of recommendations.slice(0, drivers.length * 2)) {
      const driver = drivers.find((d) => d.id === rec.driverId);
      const route = await this.prisma.route.create({
        data: {
          name: `Rota Alocada - ${(driver as any)?.user?.name || rec.driverId}`,
          driverId: rec.driverId,
          vehicleId: rec.vehicleId,
          status: "SUGGESTED",
          totalDistance: rec.totalDistance,
          totalWeight: rec.totalWeight,
          totalVolume: rec.totalVolume,
          stopCount: rec.invoiceIds.length,
          capacityUtilization: rec.capacityUtilization,
          riskScore: rec.score,
          organizationId,
          stops: {
            create: rec.invoiceIds.map((invId, idx) => ({
              invoiceId: invId,
              stopSequence: idx + 1,
              organizationId,
            })),
          },
        },
        include: { stops: true },
      });

      await this.prisma.assignmentRecommendation.create({
        data: {
          routeId: route.id,
          rank: saved.length + 1,
          driverId: rec.driverId,
          vehicleId: rec.vehicleId,
          totalDistance: rec.totalDistance,
          totalDuration: Math.round(
            (rec.totalDistance / this.AVG_SPEED_KMH) * 60 +
              rec.invoiceIds.length * this.STOP_TIME_MIN,
          ),
          totalCost: rec.totalDistance * 2.5,
          capacityUtilization: rec.capacityUtilization,
          riskScore: rec.score,
          score: rec.score,
          reason: rec.reason,
          warnings: rec.warnings.length > 0 ? rec.warnings : undefined,
          organizationId,
        },
      });

      saved.push({
        routeId: route.id,
        driverName: (driver as any)?.user?.name || "Desconhecido",
        vehicleNumber: (driver as any)?.vehicle?.vehicleNumber || "N/A",
        stopCount: rec.invoiceIds.length,
        score: rec.score.toFixed(1),
        reason: rec.reason,
        warnings: rec.warnings,
      });
    }

    return {
      message: `Alocacao concluida. ${saved.length} rota(s) recomendada(s).`,
      recommendations: saved,
    };
  }

  private async validateOrders(organizationId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        deliveryId: null,
        deletedAt: null,
        addressLat: { not: null },
        addressLng: { not: null },
      },
      select: {
        id: true,
        weight: true,
        volume: true,
        priority: true,
        fragile: true,
        deliveryDeadline: true,
        addressLat: true,
        addressLng: true,
        zoneId: true,
        unloadRequired: true,
        helperRequired: true,
        deliveryNotes: true,
      },
    });

    if (invoices.length === 0) return [];

    const valid = invoices.filter((i) => {
      const issues: string[] = [];
      if (!i.addressLat || !i.addressLng) issues.push("missing coordinates");
      if (i.weight && i.weight > 40000) issues.push("weight exceeds 40 tons");
      if (issues.length > 0) {
        this.logger.warn(
          `Invoice ${i.id} validation issues: ${issues.join(", ")}`,
        );
        return false;
      }
      return true;
    });

    return valid;
  }

  private async getAvailableDrivers(organizationId: string) {
    const drivers = await this.prisma.driver.findMany({
      where: {
        availabilityStatus: true,
        isOnline: true,
        organizationId,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, name: true } },
        vehicle: {
          select: {
            id: true,
            vehicleNumber: true,
            capacity: true,
            activeStatus: true,
            vehicleCapacities: {
              select: { maxWeight: true, maxVolume: true, maxStops: true },
            },
          },
        },
        driverPerformance: {
          select: { score: true, onTimeRate: true, totalDeliveries: true },
        },
        driverShifts: { where: { isAvailable: true } },
      },
    });

    const busyDriverIds = (
      await this.prisma.delivery.findMany({
        where: {
          organizationId,
          driverId: { not: null },
          status: { in: ["ASSIGNED", "LOADED", "IN_TRANSIT"] },
        },
        select: { driverId: true },
      })
    ).map((d) => d.driverId);

    return drivers.filter(
      (d: any) =>
        d.vehicle?.activeStatus !== false && !busyDriverIds.includes(d.id),
    );
  }

  private groupByProximity(invoices: any[], maxRadiusKm: number): any[][] {
    const groups: any[][] = [];
    const assigned = new Set<string>();

    const sorted = [...invoices].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );

    for (const inv of sorted) {
      if (assigned.has(inv.id)) continue;

      const group = [inv];
      assigned.add(inv.id);

      for (const other of sorted) {
        if (assigned.has(other.id)) continue;
        const dist = this.haversine(
          inv.addressLat,
          inv.addressLng,
          other.addressLat,
          other.addressLng,
        );
        if (dist <= maxRadiusKm) {
          group.push(other);
          assigned.add(other.id);
        }
      }

      if (group.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  private async scoreAssignments(
    groups: any[][],
    drivers: any[],
    organizationId: string,
  ): Promise<AssignmentRecommendation[]> {
    const recommendations: AssignmentRecommendation[] = [];

    for (const group of groups) {
      const totalWeight = group.reduce((s, i) => s + (i.weight || 0), 0);
      const totalVolume = group.reduce((s, i) => s + (i.volume || 0), 0);

      for (const driver of drivers) {
        const vc = driver.vehicle?.vehicleCapacities?.[0];
        const maxWeight = vc?.maxWeight || 10000;
        const maxVolume = vc?.maxVolume || 50;
        const maxStops = vc?.maxStops || 30;

        // Match vehicle capacity
        if (totalWeight > maxWeight) continue;
        if (totalVolume > maxVolume) continue;
        if (group.length > maxStops) continue;

        // Match driver availability (shift check)
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();
        const shiftOk =
          driver.driverShifts.length === 0 ||
          driver.driverShifts.some(
            (s: any) =>
              s.dayOfWeek === currentDay &&
              parseInt(s.startTime) <= currentHour &&
              parseInt(s.endTime) >= currentHour,
          );
        if (!shiftOk) continue;

        // Calculate distance
        let totalDistance = 0;
        let prevLat = driver.liveLatitude ?? -23.5505;
        let prevLng = driver.liveLongitude ?? -46.6333;

        const ordered = this.nearestNeighbor(group, prevLat, prevLng);

        for (const stop of ordered) {
          const dist = this.haversine(
            prevLat,
            prevLng,
            stop.addressLat,
            stop.addressLng,
          );
          totalDistance += dist;
          prevLat = stop.addressLat!;
          prevLng = stop.addressLng!;
        }

        const totalDurationMin =
          (totalDistance / this.AVG_SPEED_KMH) * 60 +
          group.length * this.STOP_TIME_MIN;
        if (totalDurationMin > this.MAX_WORK_MINUTES) continue;

        // Calculate score (lower is better)
        const distanceScore = totalDistance * 0.3;
        const capacityScore = (1 - totalWeight / maxWeight) * 0.2;
        const durationScore = (totalDurationMin / this.MAX_WORK_MINUTES) * 0.2;
        const perfScore = driver.driverPerformance
          ? (1 - (driver.driverPerformance.score || 5) / 5) * 0.15
          : 0.1;
        const densityScore = (1 - group.length / maxStops) * 0.15;

        const score =
          distanceScore +
          capacityScore +
          durationScore +
          perfScore +
          densityScore;

        const warnings: string[] = [];
        if (totalDurationMin > this.MAX_WORK_MINUTES * 0.8) {
          warnings.push("Jornada proxima do limite");
        }
        if (group.length > this.MAX_DAILY_DELIVERIES * 0.8) {
          warnings.push("Numero alto de entregas");
        }
        if (group.some((i) => i.fragile)) {
          warnings.push("Contem carga fragil");
        }

        const capacityUtil =
          maxWeight > 0 ? (totalWeight / maxWeight) * 100 : 0;

        const reasons: string[] = [];
        if (totalDistance < 10) reasons.push("proxima ao motorista");
        if (group.length <= 5) reasons.push("grupo pequeno e eficiente");
        if (capacityUtil < 80) reasons.push("boa utilizacao de capacidade");

        recommendations.push({
          driverId: driver.id,
          vehicleId: driver.vehicle!.id,
          invoiceIds: ordered.map((i) => i.id),
          score,
          totalDistance,
          totalWeight,
          totalVolume,
          capacityUtilization: capacityUtil,
          warnings,
          reason: reasons.length > 0 ? reasons.join(", ") : "alocacao viavel",
        });
      }
    }

    return recommendations;
  }

  private nearestNeighbor(points: any[], startLat: number, startLng: number) {
    if (points.length <= 1) return points;
    const result: any[] = [];
    const unvisited = [...points];
    let lat = startLat;
    let lng = startLng;

    while (unvisited.length > 0) {
      let nearestIdx = -1;
      let minDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const dist = this.haversine(
          lat,
          lng,
          unvisited[i].addressLat,
          unvisited[i].addressLng,
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      const next = unvisited.splice(nearestIdx, 1)[0];
      result.push(next);
      lat = next.addressLat!;
      lng = next.addressLng!;
    }

    return result;
  }

  private haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
