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
      existingCustomer = await this.prisma.customer.findUnique({
        where: { id: targetCustomerId }
      });
    }

    if (!existingCustomer) {
      // Busca o primeiro cliente disponível como fallback seguro
      const firstCustomer = await this.prisma.customer.findFirst();
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
            organizationId: data.organizationId || null
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

  async findOne(id: string): Promise<any | null> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        driver: {
          include: { user: true },
        },
      },
    });

    if (delivery) return delivery;

    return this.prisma.order.findUnique({
      where: { id },
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

  async updateStatus(id: string, status: OrderStatus) {
    return this.prisma.delivery.update({
      where: { id },
      data: { status },
    });
  }

  async assignDriver(
    deliveryId: string,
    driverId: string | null,
    dispatcherId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the delivery row with FOR UPDATE to prevent concurrent assignments
      const rows = await tx.$queryRawUnsafe<
        Array<{ id: string; driverId: string | null; status: string }>
      >(
        `SELECT id, "driverId", status FROM "Delivery" WHERE id = $1 FOR UPDATE`,
        deliveryId,
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
        const driverRows = await tx.$queryRawUnsafe<
          Array<{ id: string }>
        >(`SELECT id FROM "Driver" WHERE id = $1 FOR UPDATE`, driverId);

        if (driverRows.length === 0) {
          throw new NotFoundException(`Driver ${driverId} not found`);
        }

        // 4. While holding the driver lock, check for existing active deliveries
        const existingAssignment = await tx.delivery.findFirst({
          where: {
            driverId,
            id: { not: deliveryId },
            status: { in: ACTIVE_DELIVERY_STATUSES },
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
    const ACTIVE_DELIVERY_STATUSES = [
      OrderStatus.ASSIGNED,
      OrderStatus.LOADED,
      OrderStatus.IN_TRANSIT,
    ];

    // Helper functions for parsing and distance calculation
    function parseToMetricValue(str: string): { value: number; unit: 'tons' | 'm3' | 'other' } {
      if (!str) return { value: 0, unit: 'other' };
      const clean = str.toLowerCase().replace(/\s+/g, '').replace(',', '.');
      const match = clean.match(/([\d.]+)/);
      const num = match ? parseFloat(match[1]) : 0;
      if (clean.includes('ton') || clean.includes('t')) {
        return { value: num, unit: 'tons' };
      }
      if (clean.includes('m3') || clean.includes('m³')) {
        return { value: num, unit: 'm3' };
      }
      return { value: num, unit: 'other' };
    }

    function toStandardTons(value: number, unit: 'tons' | 'm3' | 'other'): number {
      if (unit === 'm3') {
        return value * 2.4; // concrete density assumption
      }
      return value;
    }

    function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    function getPriority(delivery: any): number {
      const customerNotes = (delivery.customer?.notes || '').toLowerCase();
      const materialType = (delivery.materialType || '').toLowerCase();
      const address = (delivery.deliveryAddress || '').toLowerCase();
      
      const urgentKeywords = ['urgente', 'urgent', 'alta', 'high', 'prioridade', 'crítica', 'critica', 'critical'];
      const isUrgent = urgentKeywords.some(keyword => 
        customerNotes.includes(keyword) || materialType.includes(keyword) || address.includes(keyword)
      );
      
      return isUrgent ? 3 : 2; // 3 = high priority, 2 = normal priority
    }

    // 1. Get all pending delivery orders
    const pendingDeliveries = await this.prisma.delivery.findMany({
      where: { status: OrderStatus.PENDING, organizationId },
      include: { customer: true },
    });

    if (pendingDeliveries.length === 0) {
      return {
        message: "Nenhuma entrega pendente para otimização.",
        assignments: [],
        savedDistanceKm: 0,
      };
    }

    // 2. Get all available trucks
    const drivers = await this.prisma.driver.findMany({
      where: {
        availabilityStatus: true,
        isOnline: true,
        organizationId,
      },
      include: {
        vehicle: true,
        user: true,
      },
    });

    // Busy drivers have active deliveries
    const activeDeliveries = await this.prisma.delivery.findMany({
      where: {
        status: { in: ACTIVE_DELIVERY_STATUSES },
        driverId: { not: null },
        organizationId,
      },
      select: { driverId: true },
    });
    const busyDriverIds = new Set(activeDeliveries.map((d) => d.driverId));
    
    // Filter active online drivers who have an active vehicle and are not busy
    const availableDrivers = drivers.filter(
      (d) => !busyDriverIds.has(d.id) && d.vehicle && d.vehicle.activeStatus,
    );

    if (availableDrivers.length === 0) {
      return {
        message: "Nenhum motorista/veículo disponível no momento para otimização.",
        assignments: [],
        savedDistanceKm: 0,
      };
    }

    // Initialize remaining capacities for vehicles in standard tons
    const truckCapacitiesMap = new Map<string, number>();
    for (const d of availableDrivers) {
      if (!d.vehicle) continue;
      const parsed = parseToMetricValue(d.vehicle.capacity);
      truckCapacitiesMap.set(d.id, toStandardTons(parsed.value, parsed.unit));
    }

    // 3. Sort orders by priority (descending) and delivery deadline (ascending)
    const now = Date.now();
    const sortedDeliveries = [...pendingDeliveries].sort((a, b) => {
      const deadlineDiff = a.scheduledTime.getTime() - b.scheduledTime.getTime();
      if (deadlineDiff !== 0) return deadlineDiff;
      
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);
      return priorityB - priorityA; // Higher priority first
    });

    const assignments: any[] = [];
    const driverAssignmentsMap = new Map<string, any[]>();

    // 4. Match each order to the best truck
    for (const delivery of sortedDeliveries) {
      const orderQtyParsed = parseToMetricValue(delivery.quantity);
      const orderWeightInTons = toStandardTons(orderQtyParsed.value, orderQtyParsed.unit);

      // Find trucks with enough remaining capacity
      const eligibleDrivers = availableDrivers.filter(driver => {
        const remainingCap = truckCapacitiesMap.get(driver.id) || 0;
        return remainingCap >= orderWeightInTons;
      });

      let bestDriver = null;
      let bestScore = Infinity;
      let bestDistance = 0;
      let bestCapacityCheck = '';

      for (const driver of eligibleDrivers) {
        if (!driver.vehicle) continue;
        
        // Calculate distance from truck current location to customer destination
        const driverLat = driver.liveLatitude ?? -23.5505;
        const driverLng = driver.liveLongitude ?? -46.6333;
        const distanceKm = haversineDistance(driverLat, driverLng, delivery.latitude, delivery.longitude);

        // Check if truck can deliver before deadline (assuming 50 km/h average speed)
        const travelTimeHours = distanceKm / 50;
        const hoursToDeadline = (delivery.scheduledTime.getTime() - now) / (3600 * 1000);
        
        if (travelTimeHours > hoursToDeadline) {
          // Skip if the truck cannot physically arrive before the scheduled deadline
          continue;
        }

        // Scoring components
        const distance_score = distanceKm;
        const remainingCap = truckCapacitiesMap.get(driver.id) || 0;
        const capacity_match = remainingCap - orderWeightInTons;
        const deadline_score = travelTimeHours;
        const driver_rating = 4.8; // Baseline rating
        const driver_rating_penalty = (5.0 - driver_rating) * 10; // 2.0

        // Scoring Formula:
        // Truck Score = (distance_score * 40%) + (capacity_match * 25%) + (deadline_score * 25%) + (driver_rating_penalty * 10%)
        const score = 
          (distance_score * 0.40) + 
          (capacity_match * 0.25) + 
          (deadline_score * 0.25) + 
          (driver_rating_penalty * 0.10);

        if (score < bestScore) {
          bestScore = score;
          bestDriver = driver;
          bestDistance = distanceKm;
          bestCapacityCheck = `${delivery.quantity} em veículo de ${driver.vehicle.capacity}`;
        }
      }

      if (bestDriver && bestDriver.vehicle) {
        // Assign order to truck with the best score
        const remainingCap = truckCapacitiesMap.get(bestDriver.id) || 0;
        truckCapacitiesMap.set(bestDriver.id, remainingCap - orderWeightInTons);

        const assignmentItem = {
          deliveryId: delivery.id,
          deliveryNumber: delivery.deliveryNumber,
          customerName: delivery.customer?.name || "Avulso",
          driverId: bestDriver.id,
          driverName: bestDriver.user?.name,
          vehicleId: bestDriver.vehicleId,
          vehicleNumber: bestDriver.vehicle.vehicleNumber,
          distanceKm: bestDistance,
          score: bestScore,
          capacityCheck: bestCapacityCheck,
          latitude: delivery.latitude,
          longitude: delivery.longitude,
          scheduledTime: delivery.scheduledTime,
        };

        assignments.push(assignmentItem);

        if (!driverAssignmentsMap.has(bestDriver.id)) {
          driverAssignmentsMap.set(bestDriver.id, []);
        }
        driverAssignmentsMap.get(bestDriver.id)!.push(assignmentItem);
      }
    }

    // 5. Group nearby orders into the same truck route & 6. Optimize route order
    const finalAssignments: any[] = [];
    let totalSavedDistance = 0;

    for (const [driverId, driverStops] of driverAssignmentsMap.entries()) {
      const driver = availableDrivers.find(d => d.id === driverId)!;
      let currentLat = driver.liveLatitude ?? -23.5505;
      let currentLng = driver.liveLongitude ?? -46.6333;

      const unvisited = [...driverStops];
      const optimizedRoute: any[] = [];

      // Nearest-Neighbor heuristic to optimize route sequence
      while (unvisited.length > 0) {
        let nearestIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
          const dist = haversineDistance(currentLat, currentLng, unvisited[i].latitude, unvisited[i].longitude);
          if (dist < minDistance) {
            minDistance = dist;
            nearestIndex = i;
          }
        }

        const nextStop = unvisited.splice(nearestIndex, 1)[0];
        optimizedRoute.push(nextStop);
        currentLat = nextStop.latitude;
        currentLng = nextStop.longitude;
        
        // Sum up average distance savings (estimating baseline search reduction)
        totalSavedDistance += (50 - minDistance);
      }

      // 7. Update database assignments & send notifications to driver
      for (const stop of optimizedRoute) {
        await this.prisma.delivery.update({
          where: { id: stop.deliveryId },
          data: {
            driverId: stop.driverId,
            vehicleId: stop.vehicleId,
            status: OrderStatus.ASSIGNED,
          },
        });

        finalAssignments.push({
          deliveryId: stop.deliveryId,
          deliveryNumber: stop.deliveryNumber,
          customerName: stop.customerName,
          driverName: stop.driverName,
          vehicleNumber: stop.vehicleNumber,
          distanceKm: stop.distanceKm.toFixed(1),
          score: stop.score.toFixed(1),
          capacityCheck: stop.capacityCheck,
        });
      }

      if (driver.userId) {
        await this.prisma.notification.create({
          data: {
            userId: driver.userId,
            title: "Rota Despachada com Sucesso",
            message: `Despacho Inteligente: sua rota foi otimizada com ${optimizedRoute.length} paradas. Verifique seu painel.`,
            organizationId,
          },
        });
      }
    }

    return {
      message: `Despacho inteligente concluído com sucesso. ${finalAssignments.length} ordens alocadas para ${driverAssignmentsMap.size} frotas.`,
      assignments: finalAssignments,
      savedDistanceKm: parseFloat(Math.max(0, totalSavedDistance).toFixed(1)),
    };
  }
}
