import { Injectable, ConflictException, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatus } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";

const ACTIVE_DELIVERY_STATUSES: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.LOADED,
  OrderStatus.IN_TRANSIT,
];

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(
    organizationId: string,
    options?: { take?: number; skip?: number; status?: OrderStatus },
  ) {
    const take = options?.take ?? 50;
    const skip = options?.skip ?? 0;
    const where: any = { organizationId, deletedAt: null };
    if (options?.status) where.status = options.status;

    const [data, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        take,
        skip,
        orderBy: { scheduledTime: "desc" },
        select: {
          id: true,
          deliveryNumber: true,
          materialType: true,
          quantity: true,
          deliveryAddress: true,
          latitude: true,
          longitude: true,
          scheduledTime: true,
          status: true,
          completedAt: true,
          createdAt: true,
          customer: { select: { id: true, name: true, address: true, phone: true } },
          driver: { select: { id: true, user: { select: { name: true } } } },
          vehicle: { select: { id: true, vehicleNumber: true, type: true } },
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return { data, total, take, skip };
  }

  async findForDriver(userId: string, organizationId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId, organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!driver) return [];

    return this.prisma.delivery.findMany({
      where: { driverId: driver.id, organizationId, deletedAt: null },
      select: {
        id: true,
        deliveryNumber: true,
        materialType: true,
        quantity: true,
        deliveryAddress: true,
        latitude: true,
        longitude: true,
        scheduledTime: true,
        status: true,
        completedAt: true,
        customer: { select: { id: true, name: true, phone: true, address: true } },
      },
      orderBy: { scheduledTime: "asc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        deliveryNumber: true,
        materialType: true,
        quantity: true,
        deliveryAddress: true,
        latitude: true,
        longitude: true,
        scheduledTime: true,
        status: true,
        completedAt: true,
        createdAt: true,
        total_km: true,
        estimated_driving_time_minutes: true,
        toll_cost: true,
        estimated_profit: true,
        delivery_margin_percentage: true,
        proof_image_url: true,
        signature_url: true,
        customer: { select: { id: true, name: true, address: true, phone: true, whatsapp: true } },
        driver: { select: { id: true, phone: true, user: { select: { name: true } } } },
        vehicle: { select: { id: true, vehicleNumber: true, type: true } },
        dispatcher: { select: { id: true, name: true } },
        statusLogs: {
          select: { id: true, status: true, changedAt: true, notes: true },
          orderBy: { changedAt: "desc" },
        },
      },
    });
    if (!delivery) throw new NotFoundException(`Delivery ${id} not found`);
    return delivery;
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: OrderStatus,
    data?: {
      notes?: string;
      cancelled_reason?: string;
      lat?: number;
      lng?: number;
      userId?: string;
    },
  ) {
    const updateData: Record<string, unknown> = { status };

    if (status === OrderStatus.LOADED)
      updateData.loading_started_at = new Date();
    if (status === OrderStatus.IN_TRANSIT)
      updateData.transit_started_at = new Date();
    if (status === OrderStatus.DELIVERED) updateData.completedAt = new Date();
    if (data?.cancelled_reason)
      updateData.cancelled_reason = data.cancelled_reason;
    if (data?.lat) updateData.pod_latitude = data.lat;
    if (data?.lng) updateData.pod_longitude = data.lng;

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.delivery.findFirst({
        where: { id, organizationId, deletedAt: null },
        select: {
          id: true,
          deliveryNumber: true,
          customer: { select: { name: true, phone: true, whatsapp: true } },
          driver: { select: { user: { select: { name: true } } } },
        },
      });
      if (!existing) throw new NotFoundException(`Delivery ${id} not found`);

      const updated = await tx.delivery.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          deliveryNumber: true,
          status: true,
          customer: { select: { id: true, name: true, phone: true, whatsapp: true } },
          driver: { select: { id: true, user: { select: { name: true } } } },
        },
      });

      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: id,
          status,
          notes: data?.notes,
          changed_by: data?.userId,
        },
      });

      return { updated, customer: existing.customer, driver: existing.driver };
    });

    const phone = result.customer?.whatsapp || result.customer?.phone;
    if (phone && result.driver) {
      if (status === OrderStatus.IN_TRANSIT && result.driver) {
        const trackingUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/tracking/${id}`;
        await this.notificationsService.notifyCustomerDriverDeparted(
          phone,
          result.driver.user.name,
          trackingUrl,
        );
      } else if (status === OrderStatus.DELIVERED) {
        await this.notificationsService.notifyCustomerDelivered(
          phone,
          result.updated.deliveryNumber,
        );
      }
    }

    return result.updated;
  }

  async uploadProof(id: string, organizationId: string, proof_image_url: string) {
    const res = await this.prisma.delivery.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: {
        proof_image_url,
        status: OrderStatus.DELIVERED,
        completedAt: new Date(),
        pod_timestamp: new Date(),
      },
    });
    if (res.count === 0) throw new NotFoundException(`Delivery ${id} not found`);
    return this.findOne(id, organizationId);
  }

  async findForPublicTracking(id: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        deliveryNumber: true,
        status: true,
        materialType: true,
        quantity: true,
        deliveryAddress: true,
        latitude: true,
        longitude: true,
        scheduledTime: true,
        completedAt: true,
        eta_minutes: true,
        proof_image_url: true,
        signature_url: true,
        customer: { select: { name: true, phone: true, address: true } },
        driver: { select: { id: true, phone: true, user: { select: { name: true } }, vehicle: { select: { vehicleNumber: true, type: true } } } },
        invoices: { select: { nfeNumber: true, accessKey: true, totalAmount: true } },
        statusLogs: {
          select: { status: true, changedAt: true, notes: true },
          orderBy: { changedAt: "asc" },
        },
      },
    });
    return delivery;
  }

  async assignResources(
    id: string,
    organizationId: string,
    data: { driverId?: string; vehicleId?: string; dispatcherId?: string },
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Lock the delivery row with FOR UPDATE
      const rows = await tx.$queryRawUnsafe<
        Array<{ id: string; driverId: string | null; status: string }>
      >(
        `SELECT id, "driverId", status FROM "Delivery" WHERE id = $1 AND "organizationId" = $2 FOR UPDATE`,
        id,
        organizationId,
      );

      if (rows.length === 0) {
        throw new NotFoundException(`Delivery ${id} not found`);
      }

      const delivery = rows[0];

      // 2. Check driver availability if assigning a driver
      if (data.driverId) {
        if (delivery.driverId && delivery.driverId !== data.driverId) {
          throw new ConflictException(
            `Delivery ${id} is already assigned to another driver. Unassign first.`,
          );
        }

        // 3. Lock the driver row to prevent concurrent double-booking
        const driverRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "Driver" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL FOR UPDATE`,
          data.driverId,
          organizationId,
        );

        if (driverRows.length === 0) {
          throw new NotFoundException(`Driver ${data.driverId} not found`);
        }

        // 4. While holding the driver lock, check for existing active deliveries
        const existingAssignment = await tx.delivery.findFirst({
          where: {
            driverId: data.driverId,
            id: { not: id },
            status: { in: ACTIVE_DELIVERY_STATUSES },
            organizationId,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (existingAssignment) {
          throw new ConflictException(
            `Driver ${data.driverId} is already assigned to active delivery ${existingAssignment.id}. Complete or cancel it first.`,
          );
        }
      }

      // 5. Safe to assign
      const updated = await tx.delivery.update({
        where: { id },
        data: {
          driverId: data.driverId,
          vehicleId: data.vehicleId,
          dispatcherId: data.dispatcherId,
          status: data.driverId ? OrderStatus.ASSIGNED : OrderStatus.PENDING,
        },
        include: {
          customer: true,
          driver: {
            include: { user: true },
          },
        },
      });

      if (data.driverId && updated.driver?.userId) {
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

    // Send notification after transaction completes — failure won't roll back the assign
    const phone = updated.customer?.whatsapp || updated.customer?.phone;
    if (phone && data.driverId) {
      await this.notificationsService.notifyCustomerDeliveryAssigned(
        phone,
        updated.customer.name,
        updated.deliveryNumber,
      );
    }

    return updated;
  }

  async calculateCosts(deliveryId: string, organizationId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, organizationId, deletedAt: null },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        vehicle: { select: { fuelType: true } },
      },
    });
    if (!delivery) throw new NotFoundException(`Delivery ${deliveryId} not found`);

    // Use PostGIS for distance calculation
    const destLat = delivery.latitude;
    const destLng = delivery.longitude;

    let total_km = 0;
    if (destLat && destLng) {
      const result: Array<{ distance: number }> = await this.prisma.$queryRaw`
        SELECT ST_DistanceSphere(
          ST_MakePoint(${destLng}, ${destLat}),
          ST_MakePoint(-46.6333, -23.5505)
        ) / 1000 as distance
      `;
      total_km = parseFloat((result[0]?.distance ?? 0).toFixed(1));
    }

    const estimated_driving_time_minutes = Math.round(total_km * 1.2 + 15);
    const toll_cost = parseFloat((total_km > 50 ? 15 + (total_km - 50) * 0.1 : 5).toFixed(2));
    const traffic_delay_minutes = total_km > 100 ? Math.round(total_km * 0.05) : 0;

    const efficiency = delivery.vehicle?.fuelType === "Diesel" ? 4.5 : 6.0;
    const expected_fuel_liters = parseFloat((total_km / efficiency).toFixed(1));
    const expected_fuel_cost = parseFloat((expected_fuel_liters * 1.15).toFixed(2));

    const driver_cost = parseFloat((estimated_driving_time_minutes * 0.45).toFixed(2));
    const assistant_cost = parseFloat((estimated_driving_time_minutes * 0.25).toFixed(2));
    const maintenance_cost = parseFloat((total_km * 0.12).toFixed(2));

    const baseline_revenue = total_km * 4.5 + 150;
    const total_cost = expected_fuel_cost + driver_cost + assistant_cost + maintenance_cost + toll_cost;
    const estimated_profit = parseFloat((baseline_revenue - total_cost).toFixed(2));
    const delivery_margin_percentage = parseFloat(((estimated_profit / baseline_revenue) * 100).toFixed(1));

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        total_km,
        estimated_driving_time_minutes,
        toll_cost,
        traffic_delay_minutes,
        expected_fuel_liters,
        expected_fuel_cost,
        driver_cost,
        assistant_cost,
        maintenance_cost,
        estimated_profit,
        delivery_margin_percentage,
      },
      select: {
        id: true,
        total_km: true,
        estimated_driving_time_minutes: true,
        toll_cost: true,
        estimated_profit: true,
        delivery_margin_percentage: true,
      },
    });
  }

  async smartAssign(deliveryId: string, organizationId: string) {
    // Find the driver with fewest active deliveries (best available)
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, organizationId, deletedAt: null },
      select: { id: true, latitude: true, longitude: true, materialType: true },
    });
    if (!delivery) throw new NotFoundException(`Delivery ${deliveryId} not found`);

    const availableDrivers = await this.prisma.driver.findMany({
      where: { availabilityStatus: true, isOnline: true, organizationId, deletedAt: null },
      select: {
        id: true,
        liveLatitude: true,
        liveLongitude: true,
        vehicleId: true,
        vehicle: { select: { id: true, type: true, capacity: true, activeStatus: true } },
        _count: { select: { deliveries: { where: { status: { in: ACTIVE_DELIVERY_STATUSES } } } } },
      },
    });

    if (availableDrivers.length === 0) {
      // Fallback: try any available driver
      const anyDriver = await this.prisma.driver.findFirst({
        where: { organizationId, deletedAt: null },
        select: { id: true, vehicleId: true },
      });
      if (!anyDriver) throw new NotFoundException("No drivers available. Register a driver first.");
      await this.assignResources(deliveryId, organizationId, {
        driverId: anyDriver.id,
        vehicleId: anyDriver.vehicleId ?? undefined,
      });
      return this.calculateCosts(deliveryId, organizationId);
    }

    // Score drivers: least active deliveries first, then closest by location
    const scored = availableDrivers
      .map((d) => ({
        id: d.id,
        vehicleId: d.vehicleId,
        activeCount: d._count.deliveries,
        score: d._count.deliveries * 100
          - (d.liveLatitude && d.liveLatitude ? 1 : 0), // Prefer drivers with known location
      }))
      .sort((a, b) => a.score - b.score);

    const best = scored[0];
    await this.assignResources(deliveryId, organizationId, {
      driverId: best.id,
      vehicleId: best.vehicleId ?? undefined,
    });

    return this.calculateCosts(deliveryId, organizationId);
  }
}
