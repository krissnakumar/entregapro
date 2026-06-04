import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FuelRequestStatus } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class FuelRequestService {
  private readonly logger = new Logger(FuelRequestService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(driverUserId: string, data: {
    organizationId: string;
    vehicleId?: string;
    loadBatchId?: string;
    amountRequested?: number;
    fuelLiters?: number;
    fuelStation?: string;
    reason?: string;
  }) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId: driverUserId, organizationId: data.organizationId, deletedAt: null },
      include: { user: true, vehicle: true },
    });

    if (!driver) throw new NotFoundException("Motorista não encontrado.");

    const vehicleId = data.vehicleId || driver.vehicleId;
    if (!vehicleId) throw new BadRequestException("Nenhum veículo associado.");

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new BadRequestException("Veículo não encontrado.");

    const request = await this.prisma.fuelRequest.create({
      data: {
        organizationId: data.organizationId,
        driverId: driver.id,
        vehicleId,
        loadBatchId: data.loadBatchId || null,
        amountRequested: data.amountRequested || null,
        fuelLiters: data.fuelLiters || null,
        fuelStation: data.fuelStation || null,
        reason: data.reason || null,
        status: FuelRequestStatus.REQUESTED,
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });

    // Notify dispatchers
    await this.notificationsService.alertDispatchersAndAdmins(
      "Solicitação de Abastecimento",
      `Motorista ${driver.user.name} solicitou abastecimento para o veículo ${vehicle.vehicleNumber}.`,
      data.organizationId,
    );

    // Real-time notification to dispatchers
    this.notificationsService.notifyFuelRequestCreated(request);

    return request;
  }

  async approve(
    id: string,
    dispatcherUserId: string,
    organizationId: string,
    data: {
      approvedAmount?: number;
      fuelLiters?: number;
      fuelStation?: string;
      note?: string;
    },
  ) {
    const request = await this.prisma.fuelRequest.findFirst({
      where: { id, organizationId },
      include: { vehicle: true, driver: { include: { user: true } } },
    });

    if (!request) throw new NotFoundException("Solicitação não encontrada.");
    if (request.status !== FuelRequestStatus.REQUESTED) {
      throw new BadRequestException(`Solicitação já foi ${request.status}.`);
    }

    const updated = await this.prisma.fuelRequest.update({
      where: { id },
      data: {
        status: FuelRequestStatus.APPROVED,
        approvedByDispatcherId: dispatcherUserId,
        approvedAt: new Date(),
        amountRequested: data.approvedAmount || request.amountRequested,
        fuelLiters: data.fuelLiters || request.fuelLiters,
        fuelStation: data.fuelStation || request.fuelStation,
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
        approvedBy: true,
      },
    });

    const dispatcher = await this.prisma.user.findUnique({ where: { id: dispatcherUserId } });

    // Notify driver
    if (request.driver?.userId) {
      await this.notificationsService.create(
        request.driver.userId,
        "Abastecimento Aprovado",
        `Seu abastecimento para o veículo ${request.vehicle.vehicleNumber} foi aprovado pelo despachante ${dispatcher?.name || "Desconhecido"}.`,
        organizationId,
      );
    }

    // Notify admins
    await this.notificationsService.alertAdmins(
      "Abastecimento Aprovado",
      `Despachante ${dispatcher?.name || "Desconhecido"} aprovou abastecimento do veículo ${request.vehicle.vehicleNumber} (Motorista: ${request.driver?.user?.name || "N/A"}).`,
      organizationId,
    );

    this.notificationsService.notifyFuelRequestUpdated(updated);

    return updated;
  }

  async reject(id: string, dispatcherUserId: string, organizationId: string, reason?: string) {
    const request = await this.prisma.fuelRequest.findFirst({
      where: { id, organizationId },
      include: { vehicle: true, driver: { include: { user: true } } },
    });

    if (!request) throw new NotFoundException("Solicitação não encontrada.");
    if (request.status !== FuelRequestStatus.REQUESTED) {
      throw new BadRequestException(`Solicitação já foi ${request.status}.`);
    }

    const updated = await this.prisma.fuelRequest.update({
      where: { id },
      data: {
        status: FuelRequestStatus.REJECTED,
        approvedByDispatcherId: dispatcherUserId,
        rejectedReason: reason || null,
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });

    const dispatcher = await this.prisma.user.findUnique({ where: { id: dispatcherUserId } });

    // Notify driver
    if (request.driver?.userId) {
      await this.notificationsService.create(
        request.driver.userId,
        "Abastecimento Recusado",
        `Seu abastecimento para o veículo ${request.vehicle.vehicleNumber} foi recusado pelo despachante ${dispatcher?.name || "Desconhecido"}.${reason ? ` Motivo: ${reason}` : ""}`,
        organizationId,
      );
    }

    // Notify admins
    await this.notificationsService.alertAdmins(
      "Abastecimento Recusado",
      `Despachante ${dispatcher?.name || "Desconhecido"} recusou abastecimento do veículo ${request.vehicle.vehicleNumber}.`,
      organizationId,
    );

    this.notificationsService.notifyFuelRequestUpdated(updated);

    return updated;
  }

  async uploadReceipt(id: string, driverUserId: string, organizationId: string, receiptPhotoUrl: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId: driverUserId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) throw new NotFoundException("Motorista não encontrado.");

    const request = await this.prisma.fuelRequest.findFirst({
      where: { id, organizationId, driverId: driver.id },
      include: { vehicle: true },
    });

    if (!request) throw new NotFoundException("Solicitação não encontrada.");
    if (request.status !== FuelRequestStatus.APPROVED) {
      throw new BadRequestException("Apenas solicitações aprovadas podem ter comprovante.");
    }

    const updated = await this.prisma.fuelRequest.update({
      where: { id },
      data: {
        status: FuelRequestStatus.PAID,
        receiptPhotoUrl,
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });

    // Notify admins
    await this.notificationsService.alertAdmins(
      "Abastecimento Pago",
      `Comprovante de abastecimento registrado para o veículo ${request.vehicle.vehicleNumber}.`,
      organizationId,
    );

    return updated;
  }

  async findAll(organizationId: string, options?: { status?: FuelRequestStatus; take?: number; skip?: number }) {
    const where: any = { organizationId };
    if (options?.status) where.status = options.status;

    const take = options?.take ?? 50;
    const skip = options?.skip ?? 0;

    const [data, total] = await Promise.all([
      this.prisma.fuelRequest.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: true,
          driver: { include: { user: true } },
          approvedBy: true,
          loadBatch: true,
        },
      }),
      this.prisma.fuelRequest.count({ where }),
    ]);

    return { data, total, take, skip };
  }

  async findOne(id: string, organizationId: string) {
    const request = await this.prisma.fuelRequest.findFirst({
      where: { id, organizationId },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
        approvedBy: true,
        loadBatch: true,
      },
    });

    if (!request) throw new NotFoundException("Solicitação não encontrada.");
    return request;
  }
}
