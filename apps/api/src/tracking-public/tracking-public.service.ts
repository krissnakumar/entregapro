import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as crypto from "crypto";

@Injectable()
export class TrackingPublicService {
  private readonly logger = new Logger(TrackingPublicService.name);

  constructor(private prisma: PrismaService) {}

  async getOrCreateToken(deliveryId: string, organizationId: string): Promise<string> {
    const existing = await this.prisma.deliveryTrackingToken.findFirst({
      where: { deliveryId, organizationId },
    });

    if (existing) return existing.token;

    const token = crypto.randomBytes(16).toString("hex");
    await this.prisma.deliveryTrackingToken.create({
      data: {
        token,
        deliveryId,
        organizationId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return token;
  }

  async getDeliveryByToken(token: string) {
    const tokenRecord = await this.prisma.deliveryTrackingToken.findUnique({
      where: { token },
      include: {
        delivery: {
          include: {
            customer: { select: { name: true, address: true, phone: true } },
            driver: { include: { user: { select: { name: true } } } },
            vehicle: { select: { vehicleNumber: true } },
            statusLogs: { orderBy: { changedAt: "desc" }, take: 1 },
            tracking: { orderBy: { timestamp: "desc" }, take: 10 },
            events: { orderBy: { createdAt: "desc" }, take: 20 },
            instructions: { orderBy: { createdAt: "desc" }, take: 1 },
            availabilityResponses: { orderBy: { responseTime: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!tokenRecord) throw new NotFoundException("Token invalido ou expirado");
    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      throw new NotFoundException("Link de rastreio expirado");
    }

    await this.prisma.deliveryTrackingToken.update({
      where: { id: tokenRecord.id },
      data: { lastAccessed: new Date() },
    });

    const delivery = tokenRecord.delivery;
    const lastTracking = delivery.tracking[0];

    return {
      status: delivery.status,
      deliveryNumber: delivery.deliveryNumber,
      estimatedArrival: delivery.scheduledTime,
      customerName: delivery.customer.name,
      customerAddress: delivery.customer.address,
      driverName: delivery.driver?.user?.name || null,
      vehicleNumber: delivery.vehicle?.vehicleNumber || null,
      etaMinutes: delivery.eta_minutes,
      events: delivery.events.map((e: any) => ({
        type: e.type,
        description: e.description,
        createdAt: e.createdAt,
      })),
      driverLocation: lastTracking
        ? { lat: lastTracking.lat, lng: lastTracking.lng }
        : null,
      instructions: delivery.instructions[0] || null,
      availabilityResponse: delivery.availabilityResponses[0] || null,
      canConfirmAvailability: ["ASSIGNED", "LOADED", "IN_TRANSIT"].includes(delivery.status),
    };
  }

  async saveInstructions(
    token: string,
    data: {
      gateCode?: string;
      buildingAccess?: string;
      apartmentNumber?: string;
      contactPerson?: string;
      loadingNotes?: string;
      preferredEntrance?: string;
      notes?: string;
    },
  ) {
    const tokenRecord = await this.prisma.deliveryTrackingToken.findUnique({
      where: { token },
    });
    if (!tokenRecord) throw new NotFoundException("Token invalido");

    const existing = await this.prisma.deliveryInstruction.findFirst({
      where: { deliveryId: tokenRecord.deliveryId },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return this.prisma.deliveryInstruction.update({
        where: { id: existing.id },
        data: { ...data, updatedAt: new Date() },
      });
    }

    return this.prisma.deliveryInstruction.create({
      data: {
        deliveryId: tokenRecord.deliveryId,
        ...data,
        source: "customer",
        organizationId: tokenRecord.organizationId,
      },
    });
  }

  async confirmAvailability(token: string, isAvailable: boolean, notes?: string) {
    const tokenRecord = await this.prisma.deliveryTrackingToken.findUnique({
      where: { token },
    });
    if (!tokenRecord) throw new NotFoundException("Token invalido");

    return this.prisma.deliveryAvailabilityResponse.create({
      data: {
        deliveryId: tokenRecord.deliveryId,
        token,
        isAvailable,
        notes,
        organizationId: tokenRecord.organizationId,
      },
    });
  }

  async requestCallback(token: string) {
    const tokenRecord = await this.prisma.deliveryTrackingToken.findUnique({
      where: { token },
    });
    if (!tokenRecord) throw new NotFoundException("Token invalido");

    await this.prisma.deliveryEvent.create({
      data: {
        deliveryId: tokenRecord.deliveryId,
        type: "callback_requested",
        description: "Cliente solicitou retorno de contato",
        organizationId: tokenRecord.organizationId,
      },
    });

    return { message: "Solicitacao de retorno enviada" };
  }

  async requestReschedule(token: string, suggestedDate?: string) {
    const tokenRecord = await this.prisma.deliveryTrackingToken.findUnique({
      where: { token },
    });
    if (!tokenRecord) throw new NotFoundException("Token invalido");

    await this.prisma.deliveryEvent.create({
      data: {
        deliveryId: tokenRecord.deliveryId,
        type: "reschedule_requested",
        description: suggestedDate
          ? `Cliente solicitou reagendamento para ${suggestedDate}`
          : "Cliente solicitou reagendamento",
        organizationId: tokenRecord.organizationId,
      },
    });

    return { message: "Solicitacao de reagendamento enviada" };
  }
}
