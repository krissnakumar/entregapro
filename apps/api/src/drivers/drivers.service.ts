import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as argon2 from "argon2";

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, options?: { take?: number; skip?: number }) {
    const take = options?.take ?? 50;
    const skip = options?.skip ?? 0;
    const where = { organizationId, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          phone: true,
          licenseNumber: true,
          availabilityStatus: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          vehicle: { select: { id: true, vehicleNumber: true, type: true } },
        },
      }),
      this.prisma.driver.count({ where }),
    ]);

    return { data, total, take, skip };
  }

  async findOne(id: string, organizationId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        user: true,
        deliveries: true,
      },
    });
    if (!driver) throw new NotFoundException("Driver not found");
    return driver;
  }

  async create(data: any) {
    const orgId = data.organizationId;
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findFirst({
        where: { name: "DRIVER", organizationId: orgId },
      });

      const password_hash = await argon2.hash(data.password || "123456");

      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email || `driver.${Date.now()}@entregapro.local`,
          phone: data.phone || null,
          password_hash,
          role_id: role?.id || null,
          organizationId: orgId,
        },
      });

      // Resolve conflicting vehicle assignments
      if (data.vehicleId) {
        const conflictingDriver = await tx.driver.findFirst({
          where: { vehicleId: data.vehicleId },
          select: { id: true },
        });
        if (conflictingDriver) {
          await tx.driver.update({
            where: { id: conflictingDriver.id },
            data: { vehicleId: null },
          });
        }
      }

      return tx.driver.create({
        data: {
          userId: user.id,
          licenseNumber: data.cnhNumber,
          phone: data.phone || "N/A",
          availabilityStatus: true,
          vehicleId: data.vehicleId || null,
          organizationId: orgId,
        },
        include: {
          user: true,
          vehicle: true,
        },
      });
    });
  }

  async update(id: string, organizationId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      // Update user data if provided
      if (data.name || data.phone) {
        const driver = await tx.driver.findFirst({
          where: { id, organizationId, deletedAt: null },
          select: { userId: true },
        });
        if (!driver) throw new NotFoundException("Driver not found");
        await tx.user.update({
          where: { id: driver.userId },
          data: {
            name: data.name,
            phone: data.phone,
          },
        });
      }

      // Resolve conflicting vehicle assignments
      if (data.vehicleId) {
        const conflictingDriver = await tx.driver.findFirst({
          where: {
            vehicleId: data.vehicleId,
            id: { not: id },
            organizationId,
          },
          select: { id: true },
        });
        if (conflictingDriver) {
          await tx.driver.update({
            where: { id: conflictingDriver.id },
            data: { vehicleId: null },
          });
        }
      }

      const res = await tx.driver.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: {
          licenseNumber: data.cnhNumber,
          phone: data.phone,
          availabilityStatus: data.availabilityStatus !== undefined ? data.availabilityStatus : undefined,
          vehicleId: data.vehicleId !== undefined ? data.vehicleId : undefined,
        },
      });
      if (res.count === 0) throw new NotFoundException("Driver not found");

      return tx.driver.findFirstOrThrow({
        where: { id, organizationId, deletedAt: null },
        include: { user: true, vehicle: true },
      });
    });
  }

  async remove(id: string, organizationId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { userId: true },
    });
    if (!driver) throw new NotFoundException("Driver not found");

    await this.prisma.driver.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date(), vehicleId: null },
    });

    // Best-effort deactivation of the user account; avoids cross-tenant deletes
    try {
      await this.prisma.user.update({
        where: { id: driver.userId },
        data: { active_status: false },
      });
    } catch (err) {
      this.logger.warn(`Failed to deactivate user ${driver.userId}: ${err.message}`);
    }

    return { success: true };
  }
}
