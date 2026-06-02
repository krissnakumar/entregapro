import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ClusteringService {
  private readonly logger = new Logger(ClusteringService.name);
  private readonly CLUSTER_RADIUS_KM = 5;

  constructor(private prisma: PrismaService) {}

  async cluster(organizationId: string) {
    const pending = await this.prisma.invoice.findMany({
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
        addressLat: true,
        addressLng: true,
        deliveryDeadline: true,
      },
    });

    if (pending.length === 0) return { clusters: [], unclustered: 0 };

    const clusters: Array<{
      invoiceIds: string[];
      totalWeight: number;
      totalVolume: number;
      avgLat: number;
      avgLng: number;
      priority: number;
    }> = [];

    const assigned = new Set<string>();

    for (const inv of pending) {
      if (assigned.has(inv.id)) continue;

      const cluster = {
        invoiceIds: [inv.id],
        totalWeight: inv.weight || 0,
        totalVolume: inv.volume || 0,
        avgLat: inv.addressLat!,
        avgLng: inv.addressLng!,
        priority: inv.priority || 0,
      };
      assigned.add(inv.id);

      for (const other of pending) {
        if (assigned.has(other.id)) continue;
        const dist = this.haversine(
          cluster.avgLat,
          cluster.avgLng,
          other.addressLat!,
          other.addressLng!,
        );
        if (dist <= this.CLUSTER_RADIUS_KM) {
          cluster.invoiceIds.push(other.id);
          cluster.totalWeight += other.weight || 0;
          cluster.totalVolume += other.volume || 0;
          cluster.avgLat =
            (cluster.avgLat * (cluster.invoiceIds.length - 1) + other.addressLat!) /
            cluster.invoiceIds.length;
          cluster.avgLng =
            (cluster.avgLng * (cluster.invoiceIds.length - 1) + other.addressLng!) /
            cluster.invoiceIds.length;
          cluster.priority = Math.max(cluster.priority, other.priority || 0);
          assigned.add(other.id);
        }
      }

      clusters.push(cluster);
    }

    const saved = [];
    for (const c of clusters) {
      const savedCluster = await this.prisma.routeCluster.create({
        data: {
          invoiceIds: c.invoiceIds,
          totalWeight: c.totalWeight,
          totalVolume: c.totalVolume,
          deliveryCount: c.invoiceIds.length,
          avgLatitude: c.avgLat,
          avgLongitude: c.avgLng,
          priority: c.priority,
          name: `Cluster ${c.invoiceIds.length} entregas - ${new Date().toLocaleDateString("pt-BR")}`,
          organizationId,
        },
      });
      saved.push(savedCluster);
    }

    return {
      clusters: saved,
      unclustered: pending.length - assigned.size,
      distance: this.CLUSTER_RADIUS_KM,
    };
  }

  async getClusters(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.routeCluster.findMany({
      where: {
        organizationId,
        createdAt: { gte: today },
      },
      orderBy: { priority: "desc" },
    });
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
