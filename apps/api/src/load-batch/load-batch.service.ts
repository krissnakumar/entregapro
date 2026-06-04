import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DeliveryStatus } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { DeliveryTimelineService } from "../delivery-timeline/delivery-timeline.service";

@Injectable()
export class LoadBatchService {
  private readonly logger = new Logger(LoadBatchService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private timelineService: DeliveryTimelineService,
  ) {}

  async create(data: {
    organizationId: string;
    driverId?: string;
    vehicleId?: string;
    dispatcherId?: string;
    deliveryIds: string[];
    totalWeight?: number;
    totalVolume?: number;
    routeDistanceKm?: number;
    estimatedDurationMinutes?: number;
  }) {
    if (data.deliveryIds.length === 0) {
      throw new BadRequestException("Pelo menos uma entrega deve ser incluída no lote.");
    }

    const batchCode = `LOTE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

    const batch = await this.prisma.loadBatch.create({
      data: {
        batchCode,
        organizationId: data.organizationId,
        driverId: data.driverId || null,
        vehicleId: data.vehicleId || null,
        dispatcherId: data.dispatcherId || null,
        status: data.driverId ? DeliveryStatus.ASSIGNED : DeliveryStatus.CREATED,
        totalWeight: data.totalWeight || null,
        totalVolume: data.totalVolume || null,
        totalDeliveries: data.deliveryIds.length,
        routeDistanceKm: data.routeDistanceKm || null,
        estimatedDurationMinutes: data.estimatedDurationMinutes || null,
        deliveries: {
          create: data.deliveryIds.map((deliveryId, idx) => ({
            deliveryId,
            stopOrder: idx + 1,
          })),
        },
      },
      include: {
        deliveries: {
          include: {
            delivery: {
              include: {
                customer: true,
              },
            },
          },
        },
        driver: { include: { user: true } },
        vehicle: true,
      },
    });

    // Update delivery status to ASSIGNED if driver is assigned
    if (data.driverId) {
      for (const deliveryId of data.deliveryIds) {
        await this.prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            deliveryStatus: DeliveryStatus.ASSIGNED,
            driverId: data.driverId,
            vehicleId: data.vehicleId || null,
            dispatcherId: data.dispatcherId || null,
          },
        });

        await this.timelineService.createStatusChange(
          deliveryId,
          data.organizationId,
          "CREATED",
          "ASSIGNED",
          data.dispatcherId,
          "DISPATCHER",
          `Lote ${batchCode} atribuído`,
        );
      }
    }

    // Notify driver if assigned
    if (data.driverId && batch.driver?.userId) {
      await this.notificationsService.notifyNewDriverAssignment(
        batch.driver.userId,
        batchCode,
        data.organizationId,
      );
    }

    // Notify dispatcher
    if (data.dispatcherId) {
      await this.notificationsService.create(
        data.dispatcherId,
        "Novo Lote Criado",
        `Lote ${batchCode} criado com ${data.deliveryIds.length} entrega(s).`,
        data.organizationId,
      );
    }

    return batch;
  }

  async approve(id: string, dispatcherId: string, organizationId: string) {
    const batch = await this.prisma.loadBatch.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        deliveries: { include: { delivery: true } },
        driver: { include: { user: true } },
      },
    });

    if (!batch) throw new NotFoundException("Lote não encontrado.");
    if (batch.status !== DeliveryStatus.CREATED && batch.status !== DeliveryStatus.ASSIGNED) {
      throw new BadRequestException(`Lote não pode ser aprovado com status ${batch.status}.`);
    }

    const updated = await this.prisma.loadBatch.update({
      where: { id },
      data: {
        status: DeliveryStatus.DRIVER_NOTIFIED,
        dispatcherId,
        approvedAt: new Date(),
      },
    });

    // Update all deliveries in the batch
    for (const bd of batch.deliveries) {
      await this.prisma.delivery.update({
        where: { id: bd.deliveryId },
        data: {
          deliveryStatus: DeliveryStatus.DRIVER_NOTIFIED,
          dispatcherId,
        },
      });

      await this.timelineService.createStatusChange(
        bd.deliveryId,
        organizationId,
        batch.status,
        "DRIVER_NOTIFIED",
        dispatcherId,
        "DISPATCHER",
        `Lote ${batch.batchCode} aprovado pelo despachante`,
      );
    }

    // Notify driver
    if (batch.driver?.userId) {
      await this.notificationsService.create(
        batch.driver.userId,
        "Lote Aprovado",
        `O lote ${batch.batchCode} foi aprovado. Você pode iniciar o carregamento.`,
        organizationId,
      );
    }

    // Notify admins
    await this.notificationsService.alertAdmins(
      "Lote Aprovado",
      `Lote ${batch.batchCode} aprovado pelo despachante com ${batch.deliveries.length} entrega(s).`,
      organizationId,
    );

    return updated;
  }

  async reject(id: string, dispatcherId: string, organizationId: string, reason?: string) {
    const batch = await this.prisma.loadBatch.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { deliveries: true },
    });

    if (!batch) throw new NotFoundException("Lote não encontrado.");

    const updated = await this.prisma.loadBatch.update({
      where: { id },
      data: { status: DeliveryStatus.CANCELLED },
    });

    // Reset delivery statuses
    for (const bd of batch.deliveries) {
      await this.prisma.delivery.update({
        where: { id: bd.deliveryId },
        data: {
          deliveryStatus: DeliveryStatus.PENDING_DISPATCH,
          driverId: null,
          vehicleId: null,
        },
      });

      await this.timelineService.createStatusChange(
        bd.deliveryId,
        organizationId,
        batch.status,
        "PENDING_DISPATCH",
        dispatcherId,
        "DISPATCHER",
        `Lote ${batch.batchCode} rejeitado: ${reason || "Sem motivo informado"}`,
      );
    }

    return updated;
  }

  async reassignDriver(
    id: string,
    newDriverId: string,
    newVehicleId: string,
    dispatcherId: string,
    organizationId: string,
  ) {
    const batch = await this.prisma.loadBatch.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { deliveries: true },
    });

    if (!batch) throw new NotFoundException("Lote não encontrado.");

    const updated = await this.prisma.loadBatch.update({
      where: { id },
      data: {
        driverId: newDriverId,
        vehicleId: newVehicleId,
        dispatcherId,
        status: DeliveryStatus.ASSIGNED,
      },
    });

    // Update deliveries
    for (const bd of batch.deliveries) {
      await this.prisma.delivery.update({
        where: { id: bd.deliveryId },
        data: {
          driverId: newDriverId,
          vehicleId: newVehicleId,
          dispatcherId,
          deliveryStatus: DeliveryStatus.ASSIGNED,
        },
      });
    }

    // Notify new driver
    const driver = await this.prisma.driver.findFirst({
      where: { id: newDriverId },
      select: { userId: true },
    });
    if (driver?.userId) {
      await this.notificationsService.notifyNewDriverAssignment(
        driver.userId,
        batch.batchCode,
        organizationId,
      );
    }

    return updated;
  }

  async findByDriver(userId: string, organizationId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) return [];

    return this.prisma.loadBatch.findMany({
      where: {
        driverId: driver.id,
        organizationId,
        deletedAt: null,
        status: {
          notIn: [DeliveryStatus.CANCELLED, DeliveryStatus.DELIVERED],
        },
      },
      include: {
        deliveries: {
          include: {
            delivery: {
              include: {
                customer: true,
                deliveryItems: true,
              },
            },
          },
          orderBy: { stopOrder: "asc" },
        },
        vehicle: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByOrganization(organizationId: string, options?: { status?: DeliveryStatus; take?: number; skip?: number }) {
    const where: any = { organizationId, deletedAt: null };
    if (options?.status) where.status = options.status;

    const take = options?.take ?? 50;
    const skip = options?.skip ?? 0;

    const [data, total] = await Promise.all([
      this.prisma.loadBatch.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          deliveries: {
            include: {
              delivery: {
                include: { customer: true },
              },
            },
          },
          driver: { include: { user: true } },
          vehicle: true,
        },
      }),
      this.prisma.loadBatch.count({ where }),
    ]);

    return { data, total, take, skip };
  }

  async findOne(id: string, organizationId: string) {
    const batch = await this.prisma.loadBatch.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        deliveries: {
          include: {
            delivery: {
              include: {
                customer: true,
                deliveryItems: true,
                driver: { include: { user: true } },
                vehicle: true,
              },
            },
          },
          orderBy: { stopOrder: "asc" },
        },
        driver: { include: { user: true } },
        vehicle: true,
      },
    });

    if (!batch) throw new NotFoundException("Lote não encontrado.");
    return batch;
  }

  async acceptByDriver(id: string, driverUserId: string, organizationId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId: driverUserId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Motorista não encontrado.");

    const batch = await this.prisma.loadBatch.findFirst({
      where: { id, organizationId, deletedAt: null, driverId: driver.id },
      include: { deliveries: true },
    });

    if (!batch) throw new NotFoundException("Lote não encontrado ou não atribuído a você.");
    if (batch.status !== DeliveryStatus.DRIVER_NOTIFIED) {
      throw new BadRequestException(`Lote não pode ser aceito com status ${batch.status}.`);
    }

    const updated = await this.prisma.loadBatch.update({
      where: { id },
      data: { status: DeliveryStatus.ACCEPTED_BY_DRIVER },
    });

    for (const bd of batch.deliveries) {
      await this.prisma.delivery.update({
        where: { id: bd.deliveryId },
        data: { deliveryStatus: DeliveryStatus.ACCEPTED_BY_DRIVER },
      });

      await this.timelineService.createStatusChange(
        bd.deliveryId,
        organizationId,
        "DRIVER_NOTIFIED",
        "ACCEPTED_BY_DRIVER",
        driverUserId,
        "DRIVER",
        "Motorista aceitou o lote",
      );
    }

    // Notify dispatcher
    if (batch.dispatcherId) {
      await this.notificationsService.create(
        batch.dispatcherId,
        "Lote Aceito",
        `Motorista aceitou o lote ${batch.batchCode}.`,
        organizationId,
      );
    }

    // Notify admins
    await this.notificationsService.alertAdmins(
      "Lote Aceito",
      `Motorista aceitou o lote ${batch.batchCode}.`,
      organizationId,
    );

    return updated;
  }

  async startLoading(id: string, driverUserId: string, organizationId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId: driverUserId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Motorista não encontrado.");

    const batch = await this.prisma.loadBatch.findFirst({
      where: { id, organizationId, deletedAt: null, driverId: driver.id },
      include: { deliveries: true },
    });

    if (!batch) throw new NotFoundException("Lote não encontrado.");
    if (batch.status !== DeliveryStatus.ACCEPTED_BY_DRIVER) {
      throw new BadRequestException(`Lote não pode iniciar carregamento com status ${batch.status}.`);
    }

    const updated = await this.prisma.loadBatch.update({
      where: { id },
      data: {
        status: DeliveryStatus.LOADING_STARTED,
        startedAt: new Date(),
      },
    });

    for (const bd of batch.deliveries) {
      await this.prisma.delivery.update({
        where: { id: bd.deliveryId },
        data: {
          deliveryStatus: DeliveryStatus.LOADING_STARTED,
          loadingStatus: "LOADING",
          loading_started_at: new Date(),
        },
      });

      await this.timelineService.createLoadingEvent(
        bd.deliveryId,
        organizationId,
        driverUserId,
        "DRIVER",
        "Motorista iniciou o carregamento",
      );
    }

    // Notify dispatcher
    if (batch.dispatcherId) {
      await this.notificationsService.create(
        batch.dispatcherId,
        "Carregamento Iniciado",
        `Motorista iniciou o carregamento do lote ${batch.batchCode}.`,
        organizationId,
      );
    }

    return updated;
  }

  async markLoaded(id: string, driverUserId: string, organizationId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId: driverUserId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Motorista não encontrado.");

    const batch = await this.prisma.loadBatch.findFirst({
      where: { id, organizationId, deletedAt: null, driverId: driver.id },
      include: { deliveries: true },
    });

    if (!batch) throw new NotFoundException("Lote não encontrado.");
    if (batch.status !== DeliveryStatus.LOADING_STARTED) {
      throw new BadRequestException(`Lote não pode ser marcado como carregado com status ${batch.status}.`);
    }

    const updated = await this.prisma.loadBatch.update({
      where: { id },
      data: { status: DeliveryStatus.LOADED },
    });

    for (const bd of batch.deliveries) {
      await this.prisma.delivery.update({
        where: { id: bd.deliveryId },
        data: {
          deliveryStatus: DeliveryStatus.LOADED,
          loadingStatus: "LOADED",
        },
      });

      await this.timelineService.createStatusChange(
        bd.deliveryId,
        organizationId,
        "LOADING_STARTED",
        "LOADED",
        driverUserId,
        "DRIVER",
        "Carregamento concluído",
      );
    }

    // Notify dispatcher + admins
    if (batch.dispatcherId) {
      await this.notificationsService.create(
        batch.dispatcherId,
        "Carregamento Concluído",
        `Lote ${batch.batchCode} foi carregado. Motorista pronto para sair.`,
        organizationId,
      );
    }

    await this.notificationsService.alertAdmins(
      "Carregamento Concluído",
      `Lote ${batch.batchCode} carregado pelo motorista.`,
      organizationId,
    );

    return updated;
  }

  async startRoute(id: string, driverUserId: string, organizationId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId: driverUserId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Motorista não encontrado.");

    const batch = await this.prisma.loadBatch.findFirst({
      where: { id, organizationId, deletedAt: null, driverId: driver.id },
      include: { deliveries: true },
    });

    if (!batch) throw new NotFoundException("Lote não encontrado.");
    if (batch.status !== DeliveryStatus.LOADED) {
      throw new BadRequestException(`Lote não pode iniciar rota com status ${batch.status}.`);
    }

    const updated = await this.prisma.loadBatch.update({
      where: { id },
      data: { status: DeliveryStatus.IN_TRANSIT },
    });

    for (const bd of batch.deliveries) {
      await this.prisma.delivery.update({
        where: { id: bd.deliveryId },
        data: {
          deliveryStatus: DeliveryStatus.IN_TRANSIT,
          transit_started_at: new Date(),
          deliveryStartedAt: new Date(),
        },
      });

      await this.timelineService.createStatusChange(
        bd.deliveryId,
        organizationId,
        "LOADED",
        "IN_TRANSIT",
        driverUserId,
        "DRIVER",
        "Motorista saiu para entrega",
      );
    }

    // Notify dispatcher + admins
    if (batch.dispatcherId) {
      await this.notificationsService.create(
        batch.dispatcherId,
        "Rota Iniciada",
        `Lote ${batch.batchCode} - Motorista saiu para entrega.`,
        organizationId,
      );
    }

    await this.notificationsService.alertAdmins(
      "Rota Iniciada",
      `Lote ${batch.batchCode} em trânsito.`,
      organizationId,
    );

    return updated;
  }

  async completeBatch(id: string, driverUserId: string, organizationId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId: driverUserId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Motorista não encontrado.");

    const batch = await this.prisma.loadBatch.findFirst({
      where: { id, organizationId, deletedAt: null, driverId: driver.id },
      include: { deliveries: true },
    });

    if (!batch) throw new NotFoundException("Lote não encontrado.");

    const updated = await this.prisma.loadBatch.update({
      where: { id },
      data: {
        status: DeliveryStatus.DELIVERED,
        completedAt: new Date(),
      },
    });

    // Notify admins
    await this.notificationsService.alertAdmins(
      "Lote Concluído",
      `Lote ${batch.batchCode} foi concluído com sucesso.`,
      organizationId,
    );

    return updated;
  }
}
