import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DeliveryEventType, DeliveryStatus } from "@prisma/client";

@Injectable()
export class DeliveryTimelineService {
  private readonly logger = new Logger(DeliveryTimelineService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: {
    deliveryId: string;
    organizationId: string;
    actorId?: string;
    actorRole?: string;
    eventType?: DeliveryEventType;
    oldStatus?: string;
    newStatus?: string;
    note?: string;
    latitude?: number;
    longitude?: number;
    photoUrl?: string;
    signatureUrl?: string;
    metadata?: any;
  }) {
    return this.prisma.deliveryTimeline.create({
      data: {
        deliveryId: data.deliveryId,
        organizationId: data.organizationId,
        actorId: data.actorId || null,
        actorRole: data.actorRole || null,
        eventType: data.eventType || DeliveryEventType.STATUS_CHANGE,
        oldStatus: data.oldStatus || null,
        newStatus: data.newStatus || null,
        note: data.note || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        photoUrl: data.photoUrl || null,
        signatureUrl: data.signatureUrl || null,
        metadata: data.metadata || undefined,
      },
    });
  }

  async createStatusChange(
    deliveryId: string,
    organizationId: string,
    oldStatus: string,
    newStatus: string,
    actorId?: string,
    actorRole?: string,
    note?: string,
  ) {
    return this.create({
      deliveryId,
      organizationId,
      actorId,
      actorRole,
      eventType: DeliveryEventType.STATUS_CHANGE,
      oldStatus,
      newStatus,
      note: note || `Status alterado de ${oldStatus} para ${newStatus}`,
    });
  }

  async createLoadingEvent(
    deliveryId: string,
    organizationId: string,
    actorId: string,
    actorRole: string,
    note: string,
    photoUrl?: string,
  ) {
    return this.create({
      deliveryId,
      organizationId,
      actorId,
      actorRole,
      eventType: DeliveryEventType.LOADING,
      newStatus: "LOADING",
      note,
      photoUrl,
    });
  }

  async createProblemEvent(
    deliveryId: string,
    organizationId: string,
    actorId: string,
    actorRole: string,
    note: string,
    latitude?: number,
    longitude?: number,
    photoUrl?: string,
  ) {
    return this.create({
      deliveryId,
      organizationId,
      actorId,
      actorRole,
      eventType: DeliveryEventType.PROBLEM,
      note,
      latitude,
      longitude,
      photoUrl,
    });
  }

  async createNoteEvent(
    deliveryId: string,
    organizationId: string,
    actorId: string,
    actorRole: string,
    note: string,
  ) {
    return this.create({
      deliveryId,
      organizationId,
      actorId,
      actorRole,
      eventType: DeliveryEventType.NOTE,
      note,
    });
  }

  async createPodEvent(
    deliveryId: string,
    organizationId: string,
    actorId: string,
    actorRole: string,
    photoUrl?: string,
    signatureUrl?: string,
    latitude?: number,
    longitude?: number,
    note?: string,
  ) {
    return this.create({
      deliveryId,
      organizationId,
      actorId,
      actorRole,
      eventType: DeliveryEventType.POD,
      newStatus: "DELIVERED",
      note: note || "Comprovante de entrega registrado",
      photoUrl,
      signatureUrl,
      latitude,
      longitude,
    });
  }

  async findByDelivery(deliveryId: string, organizationId: string) {
    return this.prisma.deliveryTimeline.findMany({
      where: { deliveryId, organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        organization: false,
      },
    });
  }

  async findRecent(organizationId: string, minutes = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.prisma.deliveryTimeline.findMany({
      where: { organizationId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
