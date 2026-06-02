import { Injectable, ConflictException, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Order, OrderStatus } from "@prisma/client";

const ACTIVE_DELIVERY_STATUSES: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.LOADED,
  OrderStatus.IN_TRANSIT,
];

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: any): Promise<Order> {
    // Garante que exista um Customer válido para não quebrar a restrição de chave estrangeira
    let targetCustomerId = data.customerId;
    
    // Verifica se o customerId enviado existe no banco
    let existingCustomer: any = null;
    if (targetCustomerId) {
      existingCustomer = await this.prisma.customer.findFirst({
        where: { id: targetCustomerId, organizationId: data.organizationId, deletedAt: null },
      });
    }

    if (!existingCustomer) {
      // Busca o primeiro cliente disponível como fallback seguro
      const firstCustomer = await this.prisma.customer.findFirst({
        where: { organizationId: data.organizationId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
      if (firstCustomer) {
        targetCustomerId = firstCustomer.id;
      } else {
        // Cria um cliente de contingência caso a base esteja limpa
        const newCustomer = await this.prisma.customer.create({
          data: {
            name: "Cliente Avulso (Despacho)",
            email: `avulso-${Date.now()}@entregapro.com`,
            phone: "5511999999999",
            address: "Endereço Padrão",
            latitude: -23.5505,
            longitude: -46.6333,
            organizationId: data.organizationId,
          }
        });
        targetCustomerId = newCustomer.id;
      }
    }

    // Calcula coordenadas seguras
    const lat = parseFloat(data.latitude);
    const lng = parseFloat(data.longitude);
    const safeLat = isNaN(lat) ? -23.5505 : lat;
    const safeLng = isNaN(lng) ? -46.6333 : lng;

    // Converte timestamp agendado para o formato correto com flexibilidade de datas passadas/futuras
    const scheduledDate = data.scheduledTime ? new Date(data.scheduledTime) : new Date();

    const order = await this.prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        dispatcherId: data.dispatcherId || null,
        organizationId: data.organizationId,
        deliveries: {
          create: {
            customerId: targetCustomerId,
            latitude: safeLat,
            longitude: safeLng,
            status: data.driverId ? OrderStatus.ASSIGNED : OrderStatus.PENDING,
            deliveryNumber: `DEL-${Date.now().toString().slice(-6)}`,
            materialType: data.materialType || "Concrete",
            quantity: data.quantity || "10m³",
            deliveryAddress: data.deliveryAddress || "Av. Principal, Centro - São Paulo",
            scheduledTime: scheduledDate,
            driverId: data.driverId || null,
            vehicleId: data.vehicleId || null,
            organizationId: data.organizationId,
          },
        },
      },
      include: {
        deliveries: {
          include: {
            driver: {
              include: { user: true },
            },
          },
        },
      },
    });

    const delivery = order.deliveries?.[0];
    if (delivery && delivery.driverId && delivery.driver?.userId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: delivery.driver.userId,
            title: "Nova entrega designada",
            message: `Você foi designado para a entrega #${delivery.deliveryNumber}.`,
            organizationId: data.organizationId,
          },
        });
      } catch (err) {
        this.logger.error(`Failed to create notification: ${err.message}`);
      }
    }

    return order;
  }

  async findAll(organizationId: string): Promise<any[]> {
    return this.prisma.order.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        deliveries: {
          include: {
            customer: true,
            driver: {
              include: { user: true },
            },
            vehicle: true,
            invoices: true,
            dispatcher: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async findForDriver(userId: string, organizationId: string) {
    return this.prisma.order.findMany({
      where: {
        organizationId,
        deliveries: {
          some: {
            driver: {
              userId: userId,
            },
          },
        },
      },
      include: {
        deliveries: {
          where: {
            driver: {
              userId: userId,
            },
          },
          include: { customer: true },
        },
      },
    });
  }

  async findOne(id: string, organizationId: string): Promise<any | null> {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        customer: true,
        driver: {
          include: { user: true },
        },
      },
    });

    if (delivery) return delivery;

    return this.prisma.order.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        deliveries: {
          include: {
            customer: true,
            driver: {
              include: { user: true },
            },
          },
        },
      },
    });
  }

  async updateStatus(id: string, organizationId: string, status: OrderStatus) {
    const res = await this.prisma.delivery.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { status },
    });
    if (res.count === 0) throw new NotFoundException(`Delivery ${id} not found`);
    return this.prisma.delivery.findFirstOrThrow({
      where: { id, organizationId, deletedAt: null },
      include: {
        customer: true,
        driver: { include: { user: true } },
        vehicle: true,
      },
    });
  }

  async assignDriver(
    deliveryId: string,
    organizationId: string,
    driverId: string | null,
    dispatcherId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the delivery row with FOR UPDATE to prevent concurrent assignments
      const rows = await tx.$queryRawUnsafe<
        Array<{ id: string; driverId: string | null; status: string }>
      >(
        `SELECT id, "driverId", status FROM "Delivery" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL FOR UPDATE`,
        deliveryId,
        organizationId,
      );

      if (rows.length === 0) {
        throw new NotFoundException(`Delivery ${deliveryId} not found`);
      }

      const delivery = rows[0];

      // If assigning a driver (not unassigning)
      if (driverId) {
        // 2. Check if delivery is already assigned to a different driver
        if (delivery.driverId && delivery.driverId !== driverId) {
          throw new ConflictException(
            `Delivery ${deliveryId} is already assigned to another driver. Unassign first.`,
          );
        }

        // 3. Lock the driver row to prevent concurrent assignment to another delivery
        const driverRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "Driver" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL FOR UPDATE`,
          driverId,
          organizationId,
        );

        if (driverRows.length === 0) {
          throw new NotFoundException(`Driver ${driverId} not found`);
        }

        // 4. While holding the driver lock, check for existing active deliveries
        const existingAssignment = await tx.delivery.findFirst({
          where: {
            driverId,
            id: { not: deliveryId },
            status: { in: ACTIVE_DELIVERY_STATUSES },
            organizationId,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (existingAssignment) {
          throw new ConflictException(
            `Driver ${driverId} is already assigned to active delivery ${existingAssignment.id}. Complete or cancel it first.`,
          );
        }
      }

      // 5. Safe to update
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          driverId,
          dispatcherId: dispatcherId,
          status: driverId ? OrderStatus.ASSIGNED : OrderStatus.PENDING,
        },
        include: {
          customer: true,
          driver: {
            include: { user: true },
          },
        },
      });

      if (driverId && updated.driver?.userId) {
        await tx.notification.create({
          data: {
            userId: updated.driver.userId,
            title: "Nova entrega designada",
            message: `Você foi designado para a entrega #${updated.deliveryNumber}.`,
            organizationId: updated.organizationId,
          },
        });
      }

      return updated;
    });
  }

  async optimize(organizationId: string): Promise<any> {
    const now = new Date();
    const ACTIVE_STATUSES: OrderStatus[] = [OrderStatus.ASSIGNED, OrderStatus.LOADED, OrderStatus.IN_TRANSIT];

    // 1. Get pending invoices with delivery info, using PostGIS for distance
    const pendingInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        deliveryId: null,
        deletedAt: null,
        addressLat: { not: null },
        addressLng: { not: null },
      },
      include: {
        delivery: { select: { status: true } },
      },
    });

    const unassignedInvoices = pendingInvoices.filter(
      (inv) => !inv.delivery || inv.delivery.status === "PENDING",
    );

    if (unassignedInvoices.length === 0) {
      return { message: "Nenhuma entrega pendente para otimização.", routes: [] };
    }

    // 2. Get available drivers with performance data
    const drivers = await this.prisma.driver.findMany({
      where: { availabilityStatus: true, isOnline: true, organizationId },
      include: {
        user: { select: { id: true, name: true } },
        driverPerformance: true,
        driverShifts: { where: { isAvailable: true } },
      },
    });

    // Filter busy drivers (those with active deliveries)
    const activeDeliveries = await this.prisma.delivery.findMany({
      where: { status: { in: ACTIVE_STATUSES }, driverId: { not: null }, organizationId },
      select: { driverId: true },
    });
    const busyIds = new Set(activeDeliveries.map((d) => d.driverId));

    // Get driver capacities
    const driverCapacities = await this.prisma.vehicleCapacity.findMany({
      where: { organizationId },
      include: { vehicle: { select: { id: true, vehicleNumber: true } } },
    });
    const vehicleIdToCap = new Map(driverCapacities.map((vc) => [vc.vehicleId, vc]));

    const availableDrivers = drivers.filter(
      (d) => !busyIds.has(d.id) && d.vehicleId && vehicleIdToCap.has(d.vehicleId),
    );

    if (availableDrivers.length === 0) {
      return { message: "Nenhum motorista disponível.", routes: [] };
    }

    // 3. Score & cluster — for each driver, find best-matching invoices using PostGIS
    const results: Array<{
      driver: (typeof availableDrivers)[0];
      capacity: (typeof driverCapacities)[0];
      stops: typeof unassignedInvoices;
      score: number;
    }> = [];

    for (const driver of availableDrivers) {
      const cap = driver.vehicleId ? vehicleIdToCap.get(driver.vehicleId)! : null;
      if (!cap) continue;
      const maxWeight = cap.maxWeight || Infinity;
      const maxVolume = cap.maxVolume || Infinity;
      const maxStops = cap.maxStops || Infinity;

      let availableWeight = maxWeight;
      let availableVolume = maxVolume;
      const stops: typeof unassignedInvoices = [];

      const invoicesByPriority = [...unassignedInvoices].sort(
        (a, b) => (b.priority || 0) - (a.priority || 0) || (a.deliveryDeadline?.getTime() || 0) - (b.deliveryDeadline?.getTime() || 0),
      );

      for (const inv of invoicesByPriority) {
        if (stops.length >= maxStops) break;
        const w = inv.weight || 0;
        const v = inv.volume || 0;
        if (w > availableWeight || v > availableVolume) continue;
        stops.push(inv);
        availableWeight -= w;
        availableVolume -= v;
      }

      if (stops.length === 0 && unassignedInvoices.length > 0) {
        const fallback = unassignedInvoices[0];
        const w = fallback.weight || 0;
        const v = fallback.volume || 0;
        if (w <= maxWeight || v <= maxVolume || maxWeight === Infinity) {
          stops.push(fallback);
        }
      }

      if (stops.length === 0) continue;

      // Calculate total distance with PostGIS
      let totalDistance = 0;
      const driverLat = driver.liveLatitude ?? -23.5505;
      const driverLng = driver.liveLongitude ?? -46.6333;
      let prevLat = driverLat;
      let prevLng = driverLng;

      for (const stop of stops) {
        const slat = stop.addressLat ?? prevLat;
        const slng = stop.addressLng ?? prevLng;
        const dist = await this.postgisDistance(prevLat, prevLng, slat, slng);
        totalDistance += dist;
        prevLat = slat;
        prevLng = slng;
      }

      const perf = driver.driverPerformance;
      const perfScore = perf ? perf.score : 5.0;
      const capacityUtil = maxWeight > 0 ? ((maxWeight - availableWeight) / maxWeight) * 100 : 50;
      const riskScore = perf ? (1 - perf.onTimeRate) * 100 : 10;

      const score = totalDistance * 0.3 + (100 - capacityUtil) * 0.2 + riskScore * 0.2 + (5 - perfScore) * 10 * 0.3;

      results.push({ driver, capacity: cap, stops, score });
    }

    // 4. Sort results by best score and deduplicate invoices
    results.sort((a, b) => a.score - b.score);
    const assignedInvoiceIds = new Set<string>();
    const finalRoutes: any[] = [];

    for (const result of results) {
      const unassignedStops = result.stops.filter((s) => !assignedInvoiceIds.has(s.id));
      if (unassignedStops.length === 0) continue;
      for (const stop of unassignedStops) assignedInvoiceIds.add(stop.id);

      // Create Route + RouteStops in DB
      const route = await this.prisma.route.create({
        data: {
          name: `Rota ${now.toLocaleDateString("pt-BR")} - ${result.driver.user?.name || result.driver.id}`,
          driverId: result.driver.id,
          vehicleId: result.capacity.vehicleId,
          status: "SUGGESTED",
          totalDistance: unassignedStops.reduce((sum, s) => {
            return sum + (s.weight || 0);
          }, 0),
          totalWeight: unassignedStops.reduce((sum, s) => sum + (s.weight || 0), 0),
          totalVolume: unassignedStops.reduce((sum, s) => sum + (s.volume || 0), 0),
          stopCount: unassignedStops.length,
          capacityUtilization: result.capacity.maxWeight
            ? (unassignedStops.reduce((s, i) => s + (i.weight || 0), 0) / result.capacity.maxWeight) * 100
            : null,
          riskScore: result.score,
          organizationId,
          stops: {
            create: unassignedStops.map((inv, idx) => ({
              invoiceId: inv.id,
              stopSequence: idx + 1,
              organizationId,
            })),
          },
        },
        include: { stops: { include: { invoice: true } } },
      });

      // Create AssignmentRecommendation
      await this.prisma.assignmentRecommendation.create({
        data: {
          routeId: route.id,
          rank: 1,
          driverId: result.driver.id,
          vehicleId: result.capacity.vehicleId,
          totalDistance: unassignedStops.length * 10,
          score: result.score,
          capacityUtilization: route.capacityUtilization,
          riskScore: result.score,
          organizationId,
        },
      });

      // Update deliveries to ASSIGNED
      const invoiceIds = unassignedStops.map((s) => s.id);
      const deliveriesToUpdate = await this.prisma.delivery.findMany({
        where: { invoices: { some: { id: { in: invoiceIds } } }, organizationId },
        select: { id: true, driverId: true },
      });
      for (const d of deliveriesToUpdate) {
        await this.prisma.delivery.update({
          where: { id: d.id },
          data: { driverId: result.driver.id, status: "ASSIGNED" },
        });
      }

      // Notify driver
      if (result.driver.userId) {
        await this.prisma.notification.create({
          data: {
            userId: result.driver.userId,
            title: "Nova Rota Atribuída",
            message: `Rota com ${unassignedStops.length} parada(s) foi atribuída a você.`,
            organizationId,
          },
        });
      }

      finalRoutes.push({
        routeId: route.id,
        driverName: result.driver.user?.name,
        vehicleNumber: result.capacity.vehicle.vehicleNumber,
        stopCount: unassignedStops.length,
        score: result.score.toFixed(1),
        riskScore: route.riskScore?.toFixed(1),
        capacityUtilization: route.capacityUtilization?.toFixed(1),
      });
    }

    return {
      message: `Despacho concluído. ${finalRoutes.length} rota(s) criada(s).`,
      routes: finalRoutes,
      unassignedCount: unassignedInvoices.length - assignedInvoiceIds.size,
    };
  }

  private async postgisDistance(lat1: number, lng1: number, lat2: number, lng2: number): Promise<number> {
    try {
      const result = await this.prisma.$queryRawUnsafe<Array<{ distance: number }>>(
        `SELECT ST_DistanceSphere(
          ST_SetSRID(ST_MakePoint($1, $2), 4326),
          ST_SetSRID(ST_MakePoint($3, $4), 4326)
        ) AS distance`,
        lng1, lat1, lng2, lat2,
      );
      return result[0]?.distance || 0;
    } catch {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
  }
}
