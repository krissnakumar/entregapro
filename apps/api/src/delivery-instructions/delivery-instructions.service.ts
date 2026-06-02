import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DeliveryInstructionsService {
  constructor(private prisma: PrismaService) {}

  async upsert(data: {
    deliveryId: string;
    gateCode?: string;
    buildingAccess?: string;
    apartmentNumber?: string;
    contactPerson?: string;
    loadingNotes?: string;
    preferredEntrance?: string;
    notes?: string;
    source?: string;
    organizationId: string;
  }) {
    const existing = await this.prisma.deliveryInstruction.findFirst({
      where: { deliveryId: data.deliveryId },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return this.prisma.deliveryInstruction.update({
        where: { id: existing.id },
        data: {
          gateCode: data.gateCode,
          buildingAccess: data.buildingAccess,
          apartmentNumber: data.apartmentNumber,
          contactPerson: data.contactPerson,
          loadingNotes: data.loadingNotes,
          preferredEntrance: data.preferredEntrance,
          notes: data.notes,
          source: data.source || "dispatcher",
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.deliveryInstruction.create({
      data: {
        deliveryId: data.deliveryId,
        gateCode: data.gateCode,
        buildingAccess: data.buildingAccess,
        apartmentNumber: data.apartmentNumber,
        contactPerson: data.contactPerson,
        loadingNotes: data.loadingNotes,
        preferredEntrance: data.preferredEntrance,
        notes: data.notes,
        source: data.source || "dispatcher",
        organizationId: data.organizationId,
      },
    });
  }

  async findByDelivery(deliveryId: string, organizationId: string) {
    const instructions = await this.prisma.deliveryInstruction.findMany({
      where: { deliveryId, organizationId },
      orderBy: { createdAt: "desc" },
    });
    return instructions;
  }

  async findOne(id: string, organizationId: string) {
    const instruction = await this.prisma.deliveryInstruction.findFirst({
      where: { id, organizationId },
    });
    if (!instruction) throw new NotFoundException("Instruction not found");
    return instruction;
  }
}
