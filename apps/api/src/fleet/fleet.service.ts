import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FleetService {
  constructor(private prisma: PrismaService) {}

  findFuelLogs(vehicleId?: string, organizationId?: string) {
    return this.prisma.fuelLog.findMany({
      where: {
        ...(vehicleId ? { vehicleId } : {}),
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
      orderBy: { fillDate: "desc" },
    });
  }

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
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : (data.nextDue ? new Date(data.nextDue) : null),
        organizationId: data.organizationId,
      },
      include: { vehicle: true },
    });
  }
}
