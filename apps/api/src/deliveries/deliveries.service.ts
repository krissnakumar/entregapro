import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrderStatus, DeliveryStatus, LoadingStatus } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { DeliveryTimelineService } from "../delivery-timeline/delivery-timeline.service";

const ACTIVE_DELIVERY_STATUSES: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.LOADED,
  OrderStatus.IN_TRANSIT,
];

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["PENDING_DISPATCH", "CANCELLED"],
  PENDING_DISPATCH: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["DRIVER_NOTIFIED", "CANCELLED"],
  DRIVER_NOTIFIED: ["ACCEPTED_BY_DRIVER", "CANCELLED"],
  ACCEPTED_BY_DRIVER: ["LOADING_STARTED", "CANCELLED"],
  LOADING_STARTED: ["LOADED"],
  LOADED: ["IN_TRANSIT"],
  IN_TRANSIT: ["ARRIVED", "FAILED"],
  ARRIVED: ["DELIVERED", "PARTIALLY_DELIVERED", "FAILED"],
  DELIVERED: [],
  PARTIALLY_DELIVERED: [],
  FAILED: ["RETURNED", "CANCELLED"],
  RETURNED: [],
  CANCELLED: [],
};

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private timelineService: DeliveryTimelineService,
  ) {}

  async findAll(
    organizationId: string,
    options?: { take?: number; skip?: number; status?: OrderStatus; deliveryStatus?: DeliveryStatus },
  ) {
    const take = options?.take ?? 50;
    const skip = options?.skip ?? 0;
    const where: any = { organizationId, deletedAt: null };
    if (options?.status) where.status = options.status;
    if (options?.deliveryStatus) where.deliveryStatus = options.deliveryStatus;

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
          deliveryStatus: true,
          loadingStatus: true,
          completedAt: true,
          deliveredAt: true,
          failedAt: true,
          failureReason: true,
          createdAt: true,
          customer: {
            select: { id: true, name: true, address: true, phone: true },
          },
          driver: { select: { id: true, user: { select: { name: true } } } },
          vehicle: { select: { id: true, vehicleNumber: true, type: true } },
          loadBatchDeliveries: {
            select: { loadBatch: { select: { id: true, batchCode: true } } },
          },
        },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return { data, total, take, skip };
  }

  private async runNotificationSafely(
    action: string,
    handler: () => Promise<void>,
  ) {
    try {
      await handler();
    } catch (error: any) {
      this.logger.error(
        `Notification side effect failed during ${action}: ${error?.message || error}`,
      );
    }
  }

  async findForDriver(userId: string, organizationId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId, organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!driver) return [];

    return this.prisma.delivery.findMany({
      where: {
        driverId: driver.id,
        organizationId,
        deletedAt: null,
        deliveryStatus: {
          notIn: [DeliveryStatus.CANCELLED, DeliveryStatus.DELIVERED, DeliveryStatus.RETURNED],
        },
      },
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
        deliveryStatus: true,
        loadingStatus: true,
        completedAt: true,
        deliveredAt: true,
        deliveryItems: true,
        customer: {
          select: { id: true, name: true, phone: true, address: true, whatsapp: true },
        },
        loadBatchDeliveries: {
          select: {
            stopOrder: true,
            loadBatch: { select: { id: true, batchCode: true, status: true } },
          },
        },
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
        deliveryStatus: true,
        loadingStatus: true,
        completedAt: true,
        deliveredAt: true,
        failedAt: true,
        failureReason: true,
        createdAt: true,
        total_km: true,
        estimated_driving_time_minutes: true,
        toll_cost: true,
        estimated_profit: true,
        delivery_margin_percentage: true,
        proof_image_url: true,
        signature_url: true,
        customer: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            whatsapp: true,
          },
        },
        driver: {
          select: { id: true, phone: true, user: { select: { name: true } } },
        },
        vehicle: { select: { id: true, vehicleNumber: true, type: true } },
        dispatcher: { select: { id: true, name: true } },
        deliveryItems: true,
        statusLogs: {
          select: { id: true, status: true, changedAt: true, notes: true },
          orderBy: { changedAt: "desc" },
        },
        timeline: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        loadBatchDeliveries: {
          select: {
            stopOrder: true,
            loadBatch: { select: { id: true, batchCode: true, status: true } },
          },
        },
      },
    });
    if (!delivery) throw new NotFoundException(`Delivery ${id} not found`);
    return delivery;
  }

  async create(
    organizationId: string,
    data: {
      customerName: string;
      customerPhone?: string;
      deliveryAddress: string;
      invoiceNumber?: string;
      productName?: string;
      quantity?: number;
      weight?: number;
      volume?: number;
      deliveryDate?: string;
      priority?: number;
      notes?: string;
      vehicleType?: string;
      latitude?: number;
      longitude?: number;
      createdByAdminId?: string;
    },
  ) {
    // Find or create customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        name: { equals: data.customerName, mode: "insensitive" },
        organizationId,
        deletedAt: null,
      },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          name: data.customerName,
          phone: data.customerPhone || "00000000000",
          address: data.deliveryAddress,
          latitude: data.latitude || -23.5505,
          longitude: data.longitude || -46.6333,
          organizationId,
        },
      });
    }

    // Check duplicate invoice
    if (data.invoiceNumber) {
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: {
          invoiceNumber: data.invoiceNumber,
          organizationId,
          deletedAt: null,
        },
      });
      if (existingInvoice) {
        throw new ConflictException(`Fatura ${data.invoiceNumber} já existe.`);
      }
    }

    const deliveryNumber = `DEL-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const delivery = await this.prisma.delivery.create({
      data: {
        deliveryNumber,
        customerId: customer.id,
        materialType: data.productName || "Geral",
        quantity: String(data.quantity || 1),
        deliveryAddress: data.deliveryAddress,
        latitude: data.latitude || customer.latitude,
        longitude: data.longitude || customer.longitude,
        scheduledTime: data.deliveryDate ? new Date(data.deliveryDate) : new Date(),
        status: OrderStatus.PENDING,
        deliveryStatus: DeliveryStatus.CREATED,
        loadingStatus: LoadingStatus.NOT_LOADED,
        organizationId,
        createdByAdminId: data.createdByAdminId || null,
      },
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
        deliveryStatus: true,
        customer: { select: { id: true, name: true, address: true, phone: true } },
      },
    });

    // Create delivery items
    if (data.productName || data.quantity) {
      await this.prisma.deliveryItem.create({
        data: {
          deliveryId: delivery.id,
          productName: data.productName || "Item",
          quantity: data.quantity || 1,
          weight: data.weight || null,
          volume: data.volume || null,
          notes: data.notes || null,
          organizationId,
        },
      });
    }

    // Create invoice if invoice number provided
    if (data.invoiceNumber) {
      await this.prisma.invoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          vendorName: data.customerName,
          totalAmount: null,
          status: "PROCESSED",
          fileUrl: "manual-entry",
          fileType: "manual",
          weight: data.weight || null,
          volume: data.volume || null,
          priority: data.priority || 0,
          deliveryNotes: data.notes || null,
          deliveryDeadline: data.deliveryDate ? new Date(data.deliveryDate) : null,
          deliveryId: delivery.id,
          organizationId,
          createdBy: data.createdByAdminId || null,
        },
      });
    }

    // Create timeline entry
    await this.timelineService.createStatusChange(
      delivery.id,
      organizationId,
      "NONE",
      "CREATED",
      data.createdByAdminId,
      "ADMIN",
      `Entrega criada manualmente${data.invoiceNumber ? ` (fatura: ${data.invoiceNumber})` : ""}`,
    );

    // Notify dispatchers
    await this.notificationsService.alertDispatchersAndAdmins(
      "Nova Entrega Criada",
      `Entrega #${delivery.deliveryNumber} criada para ${data.customerName}.`,
      organizationId,
    );

    return delivery;
  }

  async updateDeliveryStatus(
    id: string,
    organizationId: string,
    newDeliveryStatus: DeliveryStatus,
    data?: {
      notes?: string;
      actorId?: string;
      actorRole?: string;
      lat?: number;
      lng?: number;
      photoUrl?: string;
      signatureUrl?: string;
      failureReason?: string;
    },
  ) {
    const existing = await this.prisma.delivery.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        deliveryNumber: true,
        deliveryStatus: true,
        driverId: true,
        dispatcherId: true,
        customer: { select: { name: true, phone: true, whatsapp: true } },
        driver: { select: { user: { select: { name: true } } } },
      },
    });

    if (!existing) throw new NotFoundException(`Delivery ${id} not found`);

    // Validate status transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[existing.deliveryStatus] || [];
    if (!allowedTransitions.includes(newDeliveryStatus)) {
      throw new BadRequestException(
        `Transição inválida: ${existing.deliveryStatus} -> ${newDeliveryStatus}. Permitidos: ${allowedTransitions.join(", ") || "nenhum"}`,
      );
    }

    const oldStatus = existing.deliveryStatus;

    // Build update data
    const updateData: any = { deliveryStatus: newDeliveryStatus };

    // Map deliveryStatus to legacy OrderStatus
    const statusMap: Record<string, OrderStatus> = {
      CREATED: OrderStatus.PENDING,
      PENDING_DISPATCH: OrderStatus.PENDING,
      ASSIGNED: OrderStatus.ASSIGNED,
      DRIVER_NOTIFIED: OrderStatus.ASSIGNED,
      ACCEPTED_BY_DRIVER: OrderStatus.ACCEPTED,
      LOADING_STARTED: OrderStatus.PICKING_UP,
      LOADED: OrderStatus.LOADED,
      IN_TRANSIT: OrderStatus.IN_TRANSIT,
      ARRIVED: OrderStatus.ARRIVED,
      DELIVERED: OrderStatus.DELIVERED,
      PARTIALLY_DELIVERED: OrderStatus.DELIVERED,
      FAILED: OrderStatus.FAILED,
      RETURNED: OrderStatus.CANCELLED,
      CANCELLED: OrderStatus.CANCELLED,
    };
    if (statusMap[newDeliveryStatus]) {
      updateData.status = statusMap[newDeliveryStatus];
    }

    // Set timestamps based on status
    if (newDeliveryStatus === DeliveryStatus.LOADING_STARTED) {
      updateData.loading_started_at = new Date();
      updateData.loadingStatus = LoadingStatus.LOADING;
    }
    if (newDeliveryStatus === DeliveryStatus.LOADED) {
      updateData.loadingStatus = LoadingStatus.LOADED;
    }
    if (newDeliveryStatus === DeliveryStatus.IN_TRANSIT) {
      updateData.transit_started_at = new Date();
      updateData.deliveryStartedAt = new Date();
    }
    if (newDeliveryStatus === DeliveryStatus.DELIVERED) {
      updateData.completedAt = new Date();
      updateData.deliveredAt = new Date();
    }
    if (newDeliveryStatus === DeliveryStatus.FAILED) {
      updateData.failedAt = new Date();
      updateData.failureReason = data?.failureReason || null;
    }
    if (data?.lat) updateData.pod_latitude = data.lat;
    if (data?.lng) updateData.pod_longitude = data.lng;

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          deliveryNumber: true,
          status: true,
          deliveryStatus: true,
        },
      });

      // Create timeline entry
      await this.timelineService.createStatusChange(
        id,
        organizationId,
        oldStatus,
        newDeliveryStatus,
        data?.actorId,
        data?.actorRole || "DRIVER",
        data?.notes || `Status alterado para ${newDeliveryStatus}`,
      );

      // Also create legacy status log
      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: id,
          status: updateData.status,
          notes: data?.notes,
          changed_by: data?.actorId,
        },
      });

      return updated;
    });

    // Best-effort notifications should never fail the status transition itself.
    await this.runNotificationSafely(
      `delivery status ${newDeliveryStatus}`,
      () =>
        this.sendStatusNotifications(
          existing,
          newDeliveryStatus,
          data,
          organizationId,
        ),
    );

    return result;
  }

  private async sendStatusNotifications(
    delivery: any,
    newStatus: DeliveryStatus,
    data: any,
    organizationId: string,
  ) {
    const deliveryNum = delivery.deliveryNumber;

    switch (newStatus) {
      case DeliveryStatus.DRIVER_NOTIFIED:
        if (delivery.driver?.user) {
          await this.notificationsService.create(
            delivery.driver.user.name, // This should be userId, but we need to get it
            "Nova Entrega",
            `Você foi designado para a entrega #${deliveryNum}.`,
            organizationId,
          );
        }
        break;

      case DeliveryStatus.ACCEPTED_BY_DRIVER:
        if (delivery.dispatcherId) {
          await this.notificationsService.create(
            delivery.dispatcherId,
            "Entrega Aceita",
            `Motorista aceitou a entrega #${deliveryNum}.`,
            organizationId,
          );
        }
        break;

      case DeliveryStatus.LOADING_STARTED:
        if (delivery.dispatcherId) {
          await this.notificationsService.create(
            delivery.dispatcherId,
            "Carregamento Iniciado",
            `Motorista iniciou carregamento da entrega #${deliveryNum}.`,
            organizationId,
          );
        }
        break;

      case DeliveryStatus.LOADED:
        if (delivery.dispatcherId) {
          await this.notificationsService.create(
            delivery.dispatcherId,
            "Carregamento Concluído",
            `Entrega #${deliveryNum} foi carregada.`,
            organizationId,
          );
        }
        await this.notificationsService.alertAdmins(
          "Carregamento Concluído",
          `Entrega #${deliveryNum} carregada.`,
          organizationId,
        );
        break;

      case DeliveryStatus.IN_TRANSIT: {
        if (delivery.dispatcherId) {
          await this.notificationsService.create(
            delivery.dispatcherId,
            "Em Trânsito",
            `Entrega #${deliveryNum} está a caminho.`,
            organizationId,
          );
        }
        // WhatsApp notification to customer
        const phone = delivery.customer?.whatsapp || delivery.customer?.phone;
        if (phone && delivery.driver) {
          const trackingUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/tracking/${delivery.id}`;
          await this.notificationsService.notifyCustomerDriverDeparted(
            phone,
            delivery.driver.user?.name || "Motorista",
            trackingUrl,
          );
        }
        break;
      }

      case DeliveryStatus.DELIVERED: {
        if (delivery.dispatcherId) {
          await this.notificationsService.create(
            delivery.dispatcherId,
            "Entrega Concluída",
            `Entrega #${deliveryNum} foi entregue com sucesso!`,
            organizationId,
          );
        }
        await this.notificationsService.alertAdmins(
          "Entrega Concluída",
          `Entrega #${deliveryNum} entregue com sucesso!`,
          organizationId,
        );
        // WhatsApp to customer
        const customerPhone = delivery.customer?.whatsapp || delivery.customer?.phone;
        if (customerPhone) {
          await this.notificationsService.notifyCustomerDelivered(customerPhone, deliveryNum);
        }
        break;
      }

      case DeliveryStatus.FAILED:
        if (delivery.dispatcherId) {
          await this.notificationsService.create(
            delivery.dispatcherId,
            "Falha na Entrega",
            `Entrega #${deliveryNum} falhou: ${data?.failureReason || "Motivo não informado"}.`,
            organizationId,
          );
        }
        await this.notificationsService.alertAdmins(
          "Falha na Entrega",
          `Entrega #${deliveryNum} falhou: ${data?.failureReason || "Motivo não informado"}.`,
          organizationId,
        );
        break;
    }
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
          customer: {
            select: { id: true, name: true, phone: true, whatsapp: true },
          },
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
      await this.runNotificationSafely(`legacy order status ${status}`, async () => {
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
      });
    }

    return result.updated;
  }

  async uploadProof(
    id: string,
    organizationId: string,
    proof_image_url: string,
  ) {
    const res = await this.prisma.delivery.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: {
        proof_image_url,
        status: OrderStatus.DELIVERED,
        deliveryStatus: DeliveryStatus.DELIVERED,
        completedAt: new Date(),
        deliveredAt: new Date(),
        pod_timestamp: new Date(),
      },
    });
    if (res.count === 0)
      throw new NotFoundException(`Delivery ${id} not found`);

    await this.timelineService.create({
      deliveryId: id,
      organizationId,
      eventType: "POD" as any,
      newStatus: "DELIVERED",
      note: "Comprovante de entrega enviado",
      photoUrl: proof_image_url,
    });

    return this.findOne(id, organizationId);
  }

  async findForPublicTracking(id: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        deliveryNumber: true,
        status: true,
        deliveryStatus: true,
        materialType: true,
        quantity: true,
        deliveryAddress: true,
        latitude: true,
        longitude: true,
        scheduledTime: true,
        completedAt: true,
        deliveredAt: true,
        eta_minutes: true,
        proof_image_url: true,
        signature_url: true,
        customer: { select: { name: true, phone: true, address: true } },
        driver: {
          select: {
            id: true,
            phone: true,
            user: { select: { name: true } },
            vehicle: { select: { vehicleNumber: true, type: true } },
          },
        },
        invoices: {
          select: { nfeNumber: true, accessKey: true, totalAmount: true },
        },
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

      if (data.driverId) {
        if (delivery.driverId && delivery.driverId !== data.driverId) {
          throw new ConflictException(
            `Delivery ${id} is already assigned to another driver. Unassign first.`,
          );
        }

        const driverRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "Driver" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL FOR UPDATE`,
          data.driverId,
          organizationId,
        );

        if (driverRows.length === 0) {
          throw new NotFoundException(`Driver ${data.driverId} not found`);
        }

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
            `Driver ${data.driverId} is already assigned to active delivery ${existingAssignment.id}.`,
          );
        }
      }

      const updated = await tx.delivery.update({
        where: { id },
        data: {
          driverId: data.driverId,
          vehicleId: data.vehicleId,
          dispatcherId: data.dispatcherId,
          status: data.driverId ? OrderStatus.ASSIGNED : OrderStatus.PENDING,
          deliveryStatus: data.driverId ? DeliveryStatus.ASSIGNED : DeliveryStatus.PENDING_DISPATCH,
        },
        include: {
          customer: true,
          driver: { include: { user: true } },
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
    if (!delivery)
      throw new NotFoundException(`Delivery ${deliveryId} not found`);

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
    const toll_cost = parseFloat(
      (total_km > 50 ? 15 + (total_km - 50) * 0.1 : 5).toFixed(2),
    );
    const traffic_delay_minutes =
      total_km > 100 ? Math.round(total_km * 0.05) : 0;

    const efficiency = delivery.vehicle?.fuelType === "Diesel" ? 4.5 : 6.0;
    const expected_fuel_liters = parseFloat((total_km / efficiency).toFixed(1));
    const expected_fuel_cost = parseFloat(
      (expected_fuel_liters * 1.15).toFixed(2),
    );

    const driver_cost = parseFloat(
      (estimated_driving_time_minutes * 0.45).toFixed(2),
    );
    const assistant_cost = parseFloat(
      (estimated_driving_time_minutes * 0.25).toFixed(2),
    );
    const maintenance_cost = parseFloat((total_km * 0.12).toFixed(2));

    const baseline_revenue = total_km * 4.5 + 150;
    const total_cost =
      expected_fuel_cost +
      driver_cost +
      assistant_cost +
      maintenance_cost +
      toll_cost;
    const estimated_profit = parseFloat(
      (baseline_revenue - total_cost).toFixed(2),
    );
    const delivery_margin_percentage = parseFloat(
      ((estimated_profit / baseline_revenue) * 100).toFixed(1),
    );

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
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, organizationId, deletedAt: null },
      select: { id: true, latitude: true, longitude: true, materialType: true },
    });
    if (!delivery)
      throw new NotFoundException(`Delivery ${deliveryId} not found`);

    const availableDrivers = await this.prisma.driver.findMany({
      where: {
        availabilityStatus: true,
        isOnline: true,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        liveLatitude: true,
        liveLongitude: true,
        vehicleId: true,
        vehicle: {
          select: { id: true, type: true, capacity: true, activeStatus: true },
        },
        _count: {
          select: {
            deliveries: { where: { status: { in: ACTIVE_DELIVERY_STATUSES } } },
          },
        },
      },
    });

    if (availableDrivers.length === 0) {
      const anyDriver = await this.prisma.driver.findFirst({
        where: { organizationId, deletedAt: null },
        select: { id: true, vehicleId: true },
      });
      if (!anyDriver)
        throw new NotFoundException(
          "No drivers available. Register a driver first.",
        );
      await this.assignResources(deliveryId, organizationId, {
        driverId: anyDriver.id,
        vehicleId: anyDriver.vehicleId ?? undefined,
      });
      return this.calculateCosts(deliveryId, organizationId);
    }

    const scored = availableDrivers
      .map((d) => ({
        id: d.id,
        vehicleId: d.vehicleId,
        activeCount: d._count.deliveries,
        score:
          d._count.deliveries * 100 -
          (d.liveLatitude && d.liveLatitude ? 1 : 0),
      }))
      .sort((a, b) => a.score - b.score);

    const best = scored[0];
    await this.assignResources(deliveryId, organizationId, {
      driverId: best.id,
      vehicleId: best.vehicleId ?? undefined,
    });

    return this.calculateCosts(deliveryId, organizationId);
  }

  async getDeliveryTimeline(deliveryId: string, organizationId: string) {
    return this.timelineService.findByDelivery(deliveryId, organizationId);
  }

  async markFailed(
    id: string,
    organizationId: string,
    data: {
      reason: string;
      notes?: string;
      photoUrl?: string;
      lat?: number;
      lng?: number;
      actorId?: string;
    },
  ) {
    if (!data.reason) {
      throw new BadRequestException("Motivo da falha é obrigatório.");
    }

    return this.updateDeliveryStatus(id, organizationId, DeliveryStatus.FAILED, {
      notes: data.notes,
      failureReason: data.reason,
      actorId: data.actorId,
      actorRole: "DRIVER",
      lat: data.lat,
      lng: data.lng,
      photoUrl: data.photoUrl,
    });
  }
}
