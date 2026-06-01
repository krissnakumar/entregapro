import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { TrackingGateway } from "../tracking/tracking.gateway";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private trackingGateway: TrackingGateway,
    @InjectQueue('whatsapp-events') private whatsappQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async findAll(userId: string, organizationId: string) {
    return this.prisma.notification.findMany({
      where: { userId, organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async markAsRead(id: string, userId: string, organizationId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { id, userId, organizationId, isRead: false },
      data: { isRead: true },
    });
    return { success: res.count > 0 };
  }

  async markAllAsRead(userId: string, organizationId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, organizationId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(userId: string, title: string, message: string, organizationId: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, title, message, organizationId },
    });

    // Emit via Socket.IO for instant delivery to foreground clients
    this.trackingGateway.notifyUser(userId, 'newNotification', notification);

    // Enqueue push notification for background delivery
    await this.notificationsQueue.add('send-push', {
      userId,
      notificationId: notification.id,
      title,
      message,
    });

    return notification;
  }

  async sendWhatsAppMessage(
    phone: string,
    templateName: string,
    templateData: Record<string, any>,
    organizationId?: string,
  ) {
    this.logger.log(`Queueing WhatsApp (${templateName}) for ${phone}`);
    
    await this.whatsappQueue.add('send-message', {
      phone,
      templateName,
      templateData,
      timestamp: new Date()
    });

    // Also log to DB for audit
    await this.prisma.whatsappMessage.create({
      data: {
        phone,
        message: `Template: ${templateName}`,
        status: 'QUEUED',
        organizationId: organizationId || 'unknown',
      }
    });
  }

  // --- CUSTOMER NOTIFICATIONS ---

  async notifyCustomerDeliveryAssigned(
    phone: string,
    customerName: string,
    deliveryNumber: string,
  ) {
    await this.sendWhatsAppMessage(phone, "delivery_assigned", {
      customerName,
      deliveryNumber,
    });
  }

  async notifyCustomerDriverDeparted(
    phone: string,
    driverName: string,
    trackingUrl: string,
  ) {
    await this.sendWhatsAppMessage(phone, "driver_departed", {
      driverName,
      trackingUrl,
    });
  }

  async notifyCustomerETA(phone: string, etaMinutes: number) {
    await this.sendWhatsAppMessage(phone, "eta_update", { etaMinutes });
  }

  async notifyCustomerDelivered(phone: string, deliveryNumber: string) {
    await this.sendWhatsAppMessage(phone, "delivery_completed", {
      deliveryNumber,
    });
  }

  // --- DISPATCHER ALERTS ---

  async alertDispatcher(title: string, message: string, organizationId?: string) {
    const where: any = { active_status: true };
    if (organizationId) {
      where.organizationId = organizationId;
      where.role = { name: "DISPATCHER", organizationId };
    } else {
      where.role = { name: "DISPATCHER" };
    }
    const dispatchers = await this.prisma.user.findMany({ where });

    for (const dispatcher of dispatchers) {
      await this.create(dispatcher.id, title, message, dispatcher.organizationId);
    }
  }

  async alertRouteDeviation(driverName: string, deliveryNumber: string) {
    await this.alertDispatcher(
      "Route Deviation Alert",
      `Driver ${driverName} has deviated from the planned route for delivery #${deliveryNumber}.`,
    );
  }

  async alertStoppedVehicle(driverName: string, durationMinutes: number) {
    await this.alertDispatcher(
      "Stopped Vehicle Alert",
      `Driver ${driverName} has been stopped for over ${durationMinutes} minutes.`,
    );
  }

  async alertDelayedTrip(deliveryNumber: string, expectedTime: Date) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { deliveryNumber },
      include: { driver: { include: { user: true } }, organization: true },
    });

    await this.alertDispatcher(
      "Delayed Trip Alert",
      `Delivery #${deliveryNumber} is delayed. Expected arrival was ${expectedTime.toLocaleTimeString()}.`,
      delivery?.organizationId,
    );

    if (delivery?.driver?.userId) {
      await this.create(
        delivery.driver.userId,
        "Alerta de Atraso",
        `Sua entrega #${deliveryNumber} está atrasada. Chegada estimada era às ${expectedTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
        delivery.organizationId,
      );
    }
  }
}
