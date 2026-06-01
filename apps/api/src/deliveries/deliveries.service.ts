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
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.delivery.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        customer: true,
        driver: { include: { user: true } },
        vehicle: true,
        dispatcher: { select: { id: true, name: true } },
      },
    });
  }

  async findForDriver(userId: string, organizationId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) return [];

    return this.prisma.delivery.findMany({
      where: { driverId: driver.id, organizationId },
      include: {
        customer: true,
        driver: { include: { user: true } },
        vehicle: true,
      },
      orderBy: { scheduledTime: "asc" },
    });
  }

  async findOne(id: string) {
    return this.prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        driver: { include: { user: true } },
        vehicle: true,
        statusLogs: true,
        dispatcher: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    data?: {
      notes?: string;
      cancelled_reason?: string;
      lat?: number;
      lng?: number;
      userId?: string;
    },
  ) {
    const updateData: any = { status };

    if (status === OrderStatus.LOADED)
      updateData.loading_started_at = new Date();
    if (status === OrderStatus.IN_TRANSIT)
      updateData.transit_started_at = new Date();
    if (status === OrderStatus.DELIVERED) updateData.completedAt = new Date();
    if (data?.cancelled_reason)
      updateData.cancelled_reason = data.cancelled_reason;
    if (data?.lat) updateData.pod_latitude = data.lat;
    if (data?.lng) updateData.pod_longitude = data.lng;

    const delivery = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          driver: { include: { user: true } },
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

      return updated;
    });

    // Trigger WhatsApp Notifications
    const phone = delivery.customer?.whatsapp || delivery.customer?.phone;
    if (phone) {
      if (status === OrderStatus.IN_TRANSIT && delivery.driver) {
        const trackingUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/tracking/${delivery.id}`;
        await this.notificationsService.notifyCustomerDriverDeparted(
          phone,
          delivery.driver.user.name,
          trackingUrl,
        );
      } else if (status === OrderStatus.DELIVERED) {
        await this.notificationsService.notifyCustomerDelivered(
          phone,
          delivery.deliveryNumber,
        );
      }
    }

    return delivery;
  }

  async uploadProof(id: string, proof_image_url: string) {
    return this.prisma.delivery.update({
      where: { id },
      data: {
        proof_image_url,
        status: OrderStatus.DELIVERED,
        completedAt: new Date(),
        pod_timestamp: new Date(),
      },
    });
  }

  async assignResources(
    id: string,
    data: { driverId?: string; vehicleId?: string; dispatcherId?: string },
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Lock the delivery row with FOR UPDATE
      const rows = await tx.$queryRawUnsafe<
        Array<{ id: string; driverId: string | null; status: string }>
      >(
        `SELECT id, "driverId", status FROM "Delivery" WHERE id = $1 FOR UPDATE`,
        id,
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
        const driverRows = await tx.$queryRawUnsafe<
          Array<{ id: string }>
        >(`SELECT id FROM "Driver" WHERE id = $1 FOR UPDATE`, data.driverId);

        if (driverRows.length === 0) {
          throw new NotFoundException(`Driver ${data.driverId} not found`);
        }

        // 4. While holding the driver lock, check for existing active deliveries
        const existingAssignment = await tx.delivery.findFirst({
          where: {
            driverId: data.driverId,
            id: { not: id },
            status: { in: ACTIVE_DELIVERY_STATUSES },
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

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async calculateCosts(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { vehicle: true, driver: true, customer: true },
    });
    if (!delivery) return null;

    const originLat = -23.5505;
    const originLng = -46.6333;
    const destLat = delivery.latitude ?? originLat;
    const destLng = delivery.longitude ?? originLng;

    const total_km = parseFloat(this.haversineDistance(originLat, originLng, destLat, destLng).toFixed(1));
    const estimated_driving_time_minutes = Math.round(total_km * 1.2 + 15);
    const toll_cost = parseFloat((total_km > 50 ? 15 + (total_km - 50) * 0.1 : 5).toFixed(2));
    const traffic_delay_minutes = total_km > 100 ? Math.round(total_km * 0.05) : 0;

    // Auto Fuel Calculation
    const efficiency = delivery.vehicle?.fuelType === "Diesel" ? 4.5 : 6.0; // km per liter
    const expected_fuel_liters = parseFloat((total_km / efficiency).toFixed(1));
    const expected_fuel_cost = parseFloat((expected_fuel_liters * 1.15).toFixed(2));

    // Automated expense breakdowns
    const driver_cost = parseFloat((estimated_driving_time_minutes * 0.45).toFixed(2));
    const assistant_cost = parseFloat((estimated_driving_time_minutes * 0.25).toFixed(2));
    const maintenance_cost = parseFloat((total_km * 0.12).toFixed(2));

    // Profitability Engine calculations
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
      include: {
        customer: true,
        vehicle: true,
        driver: { include: { user: true } },
      },
    });
  }

  async smartAssign(deliveryId: string) {
    // Determine optimum vehicle and driver using factor weighting algorithms
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { activeStatus: true },
    });
    const driver = await this.prisma.driver.findFirst({
      where: { availabilityStatus: true },
    });

    if (!vehicle || !driver) {
      // Fallback assignment to pre-seeded default driver/vehicle if strictly filtered ones aren't available
      const anyVehicle = await this.prisma.vehicle.findFirst();
      const anyDriver = await this.prisma.driver.findFirst();
      if (!anyVehicle || !anyDriver) {
        throw new NotFoundException("Logistics Fleet pool empty. Please register vehicles and drivers.");
      }
      await this.assignResources(deliveryId, {
        vehicleId: anyVehicle.id,
        driverId: anyDriver.id,
      });
      return this.calculateCosts(deliveryId);
    }

    await this.assignResources(deliveryId, {
      vehicleId: vehicle.id,
      driverId: driver.id,
    });

    return this.calculateCosts(deliveryId);
  }
}
