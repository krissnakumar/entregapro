import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VoiceNotesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    deliveryId: string;
    driverId: string;
    routeId?: string;
    stopId?: string;
    audioUrl: string;
    durationSec?: number;
    mimeType?: string;
    organizationId: string;
  }) {
    return this.prisma.deliveryVoiceNote.create({ data });
  }

  async findByDelivery(deliveryId: string, organizationId: string) {
    return this.prisma.deliveryVoiceNote.findMany({
      where: { deliveryId, organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByDriver(
    driverId: string,
    organizationId: string,
    skip = 0,
    take = 50,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.deliveryVoiceNote.findMany({
        where: { driverId, organizationId },
        orderBy: { createdAt: "desc" },
        skip,
        take: Math.min(take, 100),
        include: {
          delivery: { select: { id: true, deliveryNumber: true } },
          stop: { select: { id: true, stopSequence: true } },
        },
      }),
      this.prisma.deliveryVoiceNote.count({
        where: { driverId, organizationId },
      }),
    ]);
    return { data, total };
  }

  async findOne(id: string, organizationId: string) {
    const note = await this.prisma.deliveryVoiceNote.findFirst({
      where: { id, organizationId },
      include: {
        driver: { include: { user: { select: { id: true, name: true } } } },
        delivery: { select: { id: true, deliveryNumber: true } },
      },
    });
    if (!note) throw new NotFoundException("Voice note not found");
    return note;
  }
}
