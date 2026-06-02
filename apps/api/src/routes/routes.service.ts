import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: {
    name?: string;
    driverId?: string;
    vehicleId?: string;
    stopIds: string[];
    organizationId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: {
          id: { in: data.stopIds },
          organizationId: data.organizationId,
          deletedAt: null,
        },
        select: {
          id: true,
          weight: true,
          volume: true,
          addressLat: true,
          addressLng: true,
        },
      });

      if (invoices.length === 0) {
        throw new NotFoundException("No valid invoices found for route stops");
      }

      const totalWeight = invoices.reduce((s, i) => s + (i.weight || 0), 0);
      const totalVolume = invoices.reduce((s, i) => s + (i.volume || 0), 0);

      const route = await tx.route.create({
        data: {
          name: data.name || `Rota ${new Date().toLocaleDateString("pt-BR")}`,
          driverId: data.driverId || null,
          vehicleId: data.vehicleId || null,
          stopCount: invoices.length,
          totalWeight,
          totalVolume,
          organizationId: data.organizationId,
          stops: {
            create: invoices.map((inv, idx) => ({
              invoiceId: inv.id,
              stopSequence: idx + 1,
              organizationId: data.organizationId,
            })),
          },
        },
        include: {
          stops: { include: { invoice: true } },
          driver: { include: { user: { select: { id: true, name: true } } } },
          vehicle: { select: { id: true, vehicleNumber: true } },
        },
      });

      return route;
    });
  }

  async findAll(
    organizationId: string,
    query: { status?: string; driverId?: string; skip?: number; take?: number },
  ) {
    const where: any = { organizationId, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.driverId) where.driverId = query.driverId;

    const take = Math.min(query.take || 50, 100);
    const skip = query.skip || 0;

    const [data, total] = await Promise.all([
      this.prisma.route.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          stops: {
            orderBy: { stopSequence: "asc" },
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  weight: true,
                  volume: true,
                },
              },
            },
          },
          driver: { include: { user: { select: { id: true, name: true } } } },
          vehicle: { select: { id: true, vehicleNumber: true } },
          routeCosts: { take: 1, orderBy: { estimatedAt: "desc" } },
          assignments: { take: 1, orderBy: { rank: "asc" } },
        },
      }),
      this.prisma.route.count({ where }),
    ]);

    return { data, total, take, skip };
  }

  async findOne(id: string, organizationId: string) {
    const route = await this.prisma.route.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        stops: {
          orderBy: { stopSequence: "asc" },
          include: {
            invoice: {
              include: {
                delivery: {
                  select: { id: true, deliveryNumber: true, status: true },
                },
              },
            },
          },
        },
        driver: { include: { user: { select: { id: true, name: true } } } },
        vehicle: true,
        routeCosts: { orderBy: { estimatedAt: "desc" } },
        assignments: { orderBy: { rank: "asc" } },
      },
    });
    if (!route) throw new NotFoundException(`Route ${id} not found`);
    return route;
  }

  async updateStatus(id: string, organizationId: string, status: string) {
    const res = await this.prisma.route.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: {
        status,
        ...(status === "STARTED" ? { startedAt: new Date() } : {}),
        ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });
    if (res.count === 0) throw new NotFoundException(`Route ${id} not found`);
    return this.findOne(id, organizationId);
  }

  async updateStopStatus(
    stopId: string,
    organizationId: string,
    data: {
      status?: string;
      actualArrival?: Date;
      actualDeparture?: Date;
      notes?: string;
    },
  ) {
    const updateData: any = { ...data };
    if (data.status === "ARRIVED" && !data.actualArrival)
      updateData.actualArrival = new Date();
    if (data.status === "COMPLETED" && !data.actualDeparture)
      updateData.actualDeparture = new Date();

    const res = await this.prisma.routeStop.updateMany({
      where: { id: stopId, organizationId },
      data: updateData,
    });
    if (res.count === 0)
      throw new NotFoundException(`RouteStop ${stopId} not found`);
    return this.prisma.routeStop.findFirst({
      where: { id: stopId },
      include: { invoice: true },
    });
  }

  async addCost(
    id: string,
    organizationId: string,
    data: {
      fuelCost?: number;
      tollCost?: number;
      driverCost?: number;
      maintenanceCost?: number;
    },
  ) {
    const totalCost =
      (data.fuelCost || 0) +
      (data.tollCost || 0) +
      (data.driverCost || 0) +
      (data.maintenanceCost || 0);
    return this.prisma.routeCost.create({
      data: {
        routeId: id,
        fuelCost: data.fuelCost,
        tollCost: data.tollCost,
        driverCost: data.driverCost,
        maintenanceCost: data.maintenanceCost,
        totalCost,
        organizationId,
      },
    });
  }

  async optimizeRoute(id: string, organizationId: string) {
    const route = await this.findOne(id, organizationId);
    const stops = route.stops;

    if (stops.length < 2) return route;

    const coords = stops.map((s) => ({
      id: s.id,
      invoiceId: s.invoiceId,
      lat: s.invoice.addressLat || -23.5505,
      lng: s.invoice.addressLng || -46.6333,
    }));

    const ordered = this.nearestNeighbor(coords);

    await this.prisma.$transaction(
      ordered.map((stop, idx) =>
        this.prisma.routeStop.update({
          where: { id: stop.id },
          data: { stopSequence: idx + 1 },
        }),
      ),
    );

    await this.prisma.route.update({
      where: { id },
      data: { optimizedAt: new Date() },
    });

    return this.findOne(id, organizationId);
  }

  private nearestNeighbor(points: { id: string; lat: number; lng: number }[]) {
    if (points.length <= 1) return points;
    const visited = new Set<string>();
    const result: typeof points = [];
    let current = points[0];
    visited.add(current.id);
    result.push(current);

    while (result.length < points.length) {
      let nearest: (typeof points)[0] | null = null;
      let minDist = Infinity;
      for (const p of points) {
        if (visited.has(p.id)) continue;
        const d = this.haversine(current.lat, current.lng, p.lat, p.lng);
        if (d < minDist) {
          minDist = d;
          nearest = p;
        }
      }
      if (nearest) {
        visited.add(nearest.id);
        result.push(nearest);
        current = nearest;
      }
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
