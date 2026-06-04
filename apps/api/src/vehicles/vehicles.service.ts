import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    options?: { take?: number; skip?: number },
  ) {
    const take = options?.take ?? 50;
    const skip = options?.skip ?? 0;
    const where = { organizationId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        take,
        skip,
        orderBy: { vehicleNumber: "asc" },
        select: {
          id: true,
          vehicleNumber: true,
          type: true,
          capacity: true,
          fuelType: true,
          activeStatus: true,
          maintenanceDue: true,
          createdAt: true,
          driver: {
            select: {
              id: true,
              licenseNumber: true,
              phone: true,
              availabilityStatus: true,
              user: {
                select: {
                  name: true,
                },
              },
              deliveries: {
                where: {
                  deliveryStatus: {
                    in: [
                      'ACCEPTED_BY_DRIVER',
                      'LOADING_STARTED',
                      'LOADED',
                      'IN_TRANSIT',
                      'ARRIVED'
                    ]
                  }
                },
                select: { id: true }
              }
            },
          },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { data, total, take, skip };
  }

  async findOne(id: string, organizationId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { deliveries: true },
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    return vehicle;
  }

  async create(data: any) {
    return this.prisma.vehicle.create({
      data: {
        vehicleNumber: data.vehicleNumber,
        type: data.type,
        capacity: data.capacity,
        fuelType: data.fuelType,
        activeStatus: data.activeStatus ?? true,
        maintenanceDue: data.maintenanceDue
          ? new Date(data.maintenanceDue)
          : null,
        organizationId: data.organizationId,
      },
    });
  }

  async update(id: string, organizationId: string, data: any) {
    const res = await this.prisma.vehicle.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: {
        vehicleNumber: data.vehicleNumber,
        type: data.type,
        capacity: data.capacity,
        fuelType: data.fuelType,
        activeStatus:
          data.activeStatus !== undefined ? data.activeStatus : undefined,
        maintenanceDue: data.maintenanceDue
          ? new Date(data.maintenanceDue)
          : undefined,
      },
    });
    if (res.count === 0) throw new NotFoundException("Vehicle not found");
    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string) {
    const res = await this.prisma.vehicle.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) throw new NotFoundException("Vehicle not found");
    return { success: true };
  }
}
