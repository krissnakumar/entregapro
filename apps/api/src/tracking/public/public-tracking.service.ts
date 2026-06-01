import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PublicTrackingService {
  constructor(private prisma: PrismaService) {}

  async getDeliveryTracking(deliveryId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, deletedAt: null },
      include: {
        customer: {
          select: { name: true, phone: true, address: true },
        },
        driver: {
          include: {
            user: { select: { name: true, phone: true } },
            vehicle: { select: { vehicleNumber: true, type: true } },
          },
        },
        invoices: {
          where: { deletedAt: null, nfeStatus: "AUTHORIZED" },
          select: { nfeNumber: true, accessKey: true, totalAmount: true },
          take: 5,
        },
        statusLogs: {
          orderBy: { changedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!delivery) throw new NotFoundException("Entrega não encontrada");

    return {
      id: delivery.id,
      deliveryNumber: delivery.deliveryNumber,
      status: delivery.status,
      materialType: delivery.materialType,
      quantity: delivery.quantity,
      deliveryAddress: delivery.deliveryAddress,
      latitude: delivery.latitude,
      longitude: delivery.longitude,
      scheduledTime: delivery.scheduledTime,
      completedAt: delivery.completedAt,
      etaMinutes: delivery.eta_minutes,
      proofImageUrl: delivery.proof_image_url,
      signatureUrl: delivery.signature_url,
      podTimestamp: delivery.pod_timestamp,
      customer: delivery.customer,
      driver: delivery.driver
        ? {
            name: delivery.driver.user?.name,
            phone: delivery.driver.user?.phone,
            vehicleNumber: delivery.driver.vehicle?.vehicleNumber,
            vehicleType: delivery.driver.vehicle?.type,
          }
        : null,
      invoices: delivery.invoices,
      timeline: delivery.statusLogs.map((log: any) => ({
        status: log.status,
        timestamp: log.changedAt,
        notes: log.notes,
      })),
    };
  }

  async getDeliveriesByDocument(document: string) {
    return this.prisma.delivery.findMany({
      where: {
        deletedAt: null,
        customer: {
          phone: { contains: document },
        },
      },
      include: {
        customer: { select: { name: true } },
        driver: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
