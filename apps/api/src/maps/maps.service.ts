import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MapsService {
  constructor(private prisma: PrismaService) {}

  async findAllZones(organizationId: string) {
    return this.prisma.zone.findMany({
      where: { active: true, organizationId, deletedAt: null },
    });
  }

  async createZone(data: {
    name: string;
    polygon: any;
    active: boolean;
    organizationId: string;
  }) {
    return this.prisma.zone.create({
      data,
    });
  }

  async removeZone(id: string) {
    return this.prisma.zone.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
