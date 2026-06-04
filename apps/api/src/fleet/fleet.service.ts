import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class FleetService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private async generateNextFuelSequenceNumber(organizationId: string) {
    const recentLogs = await this.prisma.fuelLog.findMany({
      where: {
        organizationId,
        jobNumber: { not: null },
      },
      select: { jobNumber: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    let maxSequence = 0;

    for (const log of recentLogs) {
      const match = log.jobNumber?.match(/(\d+)/);
      if (!match) continue;

      const sequence = Number(match[1]);
      if (Number.isFinite(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }

    return String(maxSequence + 1).padStart(6, "0");
  }

  findFuelLogs(vehicleId?: string, organizationId?: string) {
    return this.prisma.fuelLog.findMany({
      where: {
        ...(vehicleId ? { vehicleId } : {}),
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
        approvedBy: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Driver initiates a request
  async createFuelRequest(userId: string, data: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!driver) {
      throw new BadRequestException("Apenas motoristas podem solicitar abastecimento.");
    }

    const vehicleId = data.vehicleId || driver.vehicleId;
    if (!vehicleId) {
      throw new BadRequestException("Nenhum veículo associado a este motorista.");
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });

    if (!vehicle) {
      throw new BadRequestException("Veículo não encontrado.");
    }

    const fuelLog = await this.prisma.fuelLog.create({
      data: {
        vehicleId,
        driverId: driver.id,
        odometer: Number(data.odometer || 0),
        status: "PENDING",
        organizationId: driver.organizationId,
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } }
      }
    });

    // Alert dispatchers and admins
    await this.notificationsService.alertDispatchersAndAdmins(
      "Solicitação de Abastecimento",
      `Motorista ${driver.user.name} solicitou abastecimento para o veículo ${vehicle.vehicleNumber}. Odômetro atual: ${fuelLog.odometer} km.`,
      driver.organizationId
    );

    this.notificationsService.notifyFuelRequestCreated(fuelLog);

    return fuelLog;
  }

  // Dispatcher approves a request and fills in the details.
  async approveFuelRequest(userId: string, logId: string, data: any) {
    const fuelLog = await this.prisma.fuelLog.findUnique({
      where: { id: logId },
      include: { vehicle: true, driver: { include: { user: true } } }
    });

    if (!fuelLog) {
      throw new NotFoundException("Solicitação de abastecimento não encontrada.");
    }

    if (fuelLog.status !== "PENDING") {
      throw new BadRequestException(`Esta solicitação de abastecimento já foi ${fuelLog.status.toLowerCase()}.`);
    }

    const litersFilled = Number(data.litersFilled || data.liters || 0);
    const costPerLiter = Number(data.costPerLiter || 0);
    const totalCost = Number(data.totalCost || litersFilled * costPerLiter);
    const autoJobNum = await this.generateNextFuelSequenceNumber(
      fuelLog.organizationId,
    );

    const updated = await this.prisma.fuelLog.update({
      where: { id: logId },
      data: {
        litersFilled,
        costPerLiter,
        totalCost,
        stationName: data.stationName || data.station || null,
        jobNumber: data.jobNumber || autoJobNum,
        receiptPhotoUrl: data.receiptPhotoUrl || data.receiptPhoto || null,
        odometerPhotoUrl: data.odometerPhotoUrl || data.odometerPhoto || null,
        status: "APPROVED",
        approvedById: userId,
        fillDate: new Date(),
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
        approvedBy: true,
      }
    });

    // Get dispatcher info for the notification
    const dispatcher = await this.prisma.user.findUnique({ where: { id: userId } });
    const dispatcherName = dispatcher?.name || "Despachante";

    // Alert admins
    await this.notificationsService.alertAdmins(
      "Abastecimento Aprovado",
      `O despachante ${dispatcherName} aprovou o abastecimento do veículo ${updated.vehicle.vehicleNumber} (Motorista: ${updated.driver?.user?.name || "N/A"}). Nº: ${updated.jobNumber || "N/A"}. Total: R$ ${totalCost.toFixed(2)}.`,
      updated.organizationId
    );

    // Also send a notification to the driver
    if (updated.driver?.userId) {
      await this.notificationsService.create(
        updated.driver.userId,
        "Abastecimento Aprovado",
        `Seu abastecimento para o veículo ${updated.vehicle.vehicleNumber} foi aprovado pelo despachante ${dispatcherName}.`,
        updated.organizationId
      );
    }

    this.notificationsService.notifyFuelRequestUpdated(updated);

    return updated;
  }

  // Dispatcher rejects a request
  async rejectFuelRequest(userId: string, logId: string) {
    const fuelLog = await this.prisma.fuelLog.findUnique({
      where: { id: logId },
      include: { vehicle: true, driver: { include: { user: true } } }
    });

    if (!fuelLog) {
      throw new NotFoundException("Solicitação de abastecimento não encontrada.");
    }

    if (fuelLog.status !== "PENDING") {
      throw new BadRequestException(`Esta solicitação de abastecimento já foi ${fuelLog.status.toLowerCase()}.`);
    }

    const updated = await this.prisma.fuelLog.update({
      where: { id: logId },
      data: {
        status: "REJECTED",
        approvedById: userId,
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      }
    });

    const dispatcher = await this.prisma.user.findUnique({ where: { id: userId } });
    const dispatcherName = dispatcher?.name || "Despachante";

    // Send a notification to the driver
    if (updated.driver?.userId) {
      await this.notificationsService.create(
        updated.driver.userId,
        "Abastecimento Recusado",
        `Seu abastecimento para o veículo ${updated.vehicle.vehicleNumber} foi recusado pelo despachante ${dispatcherName}.`,
        updated.organizationId
      );
    }

    this.notificationsService.notifyFuelRequestUpdated(updated);

    return updated;
  }

  // Fallback / standard creation (e.g. for backwards compatibility or manual log by admin/dispatcher)
  createFuelLog(data: any) {
    const litersFilled = Number(data.litersFilled || data.liters || 0);
    const costPerLiter = Number(data.costPerLiter || 0);
    const totalCost = Number(data.totalCost || litersFilled * costPerLiter);

    return this.prisma.fuelLog.create({
      data: {
        vehicleId: data.vehicleId,
        driverId: data.driverId || null,
        litersFilled,
        costPerLiter,
        totalCost,
        odometer: Number(data.odometer || data.odo || 0),
        stationName: data.stationName || data.station || null,
        fillDate: data.fillDate ? new Date(data.fillDate) : new Date(),
        status: "APPROVED",
        organizationId: data.organizationId,
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });
  }

  findMaintenanceLogs(vehicleId?: string, organizationId?: string) {
    return this.prisma.maintenanceLog.findMany({
      where: {
        ...(vehicleId ? { vehicleId } : {}),
        ...(organizationId ? { organizationId } : {}),
      },
      include: { vehicle: true },
      orderBy: { serviceDate: "desc" },
    });
  }

  createMaintenanceLog(data: any) {
    return this.prisma.maintenanceLog.create({
      data: {
        vehicleId: data.vehicleId,
        serviceType: data.serviceType || data.type,
        serviceDate: data.serviceDate ? new Date(data.serviceDate) : new Date(),
        cost: Number(data.cost || 0),
        odometer: Number(data.odometer || data.odo || 0),
        providerName: data.providerName || null,
        notes: data.notes || null,
        nextDueDate: data.nextDueDate
          ? new Date(data.nextDueDate)
          : data.nextDue
            ? new Date(data.nextDue)
            : null,
        organizationId: data.organizationId,
      },
      include: { vehicle: true },
    });
  }
}
