import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProofOfDeliveryService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    deliveryId: string;
    photoUrl?: string;
    signatureUrl?: string;
    latitude?: number;
    longitude?: number;
    driverNote?: string;
    recipientName?: string;
    recipientDoc?: string;
    organizationId: string;
  }) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: data.deliveryId, organizationId: data.organizationId },
    });
    if (!delivery) throw new NotFoundException("Delivery not found");

    const [pod] = await this.prisma.$transaction([
      this.prisma.proofOfDelivery.upsert({
        where: { deliveryId: data.deliveryId },
        create: {
          ...data,
          capturedAt: new Date(),
        },
        update: {
          photoUrl: data.photoUrl,
          signatureUrl: data.signatureUrl,
          latitude: data.latitude,
          longitude: data.longitude,
          driverNote: data.driverNote,
          recipientName: data.recipientName,
          recipientDoc: data.recipientDoc,
          capturedAt: new Date(),
        },
      }),
      this.prisma.delivery.update({
        where: { id: data.deliveryId },
        data: {
          proof_image_url: data.photoUrl,
          signature_url: data.signatureUrl,
          pod_latitude: data.latitude,
          pod_longitude: data.longitude,
          pod_timestamp: new Date(),
        },
      }),
    ]);

    return pod;
  }

  async findByDelivery(deliveryId: string, organizationId: string) {
    const pod = await this.prisma.proofOfDelivery.findFirst({
      where: { deliveryId, organizationId },
    });
    if (!pod) throw new NotFoundException("Proof of delivery not found");
    return pod;
  }

  async findRecent(organizationId: string, skip = 0, take = 50) {
    const [data, total] = await Promise.all([
      this.prisma.proofOfDelivery.findMany({
        where: { organizationId },
        orderBy: { capturedAt: "desc" },
        skip,
        take: Math.min(take, 100),
        include: {
          delivery: {
            select: {
              id: true,
              deliveryNumber: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.proofOfDelivery.count({ where: { organizationId } }),
    ]);
    return { data, total };
  }
}
