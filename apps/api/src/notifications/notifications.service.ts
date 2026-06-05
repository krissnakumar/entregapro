import { Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { TrackingGateway } from "../tracking/tracking.gateway";
import { PushTokensService } from "./push-tokens.service";

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";
const PUSH_QUEUE_TIMEOUT_MS = 2000;

export interface ExpoPushTicket {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

export interface PushDeliveryResult {
  mode: "queue" | "direct";
  tokenCount: number;
  tickets: ExpoPushTicket[];
  errors: string[];
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private trackingGateway: TrackingGateway,
    private pushTokensService: PushTokensService,
    @Optional() @InjectQueue("whatsapp-events") private whatsappQueue?: Queue,
    @Optional() @InjectQueue("notifications") private notificationsQueue?: Queue,
  ) {}

  async findAll(userId: string, organizationId: string) {
    return this.prisma.notification.findMany({
      where: { userId, organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
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

  async sendTestPush(userId: string, organizationId: string, userName?: string) {
    const timestamp = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    return this.create(
      userId,
      "Teste de Push",
      `Push enviado com sucesso para ${userName || "sua conta"} em ${timestamp}.`,
      organizationId,
      "PUSH_TEST",
      { source: "manual_test", sentAt: new Date().toISOString() },
    );
  }

  async getPushDiagnostics(userId: string) {
    const tokens = await this.pushTokensService.getTokens(userId);

    return {
      tokenCount: tokens.length,
      maskedTokens: tokens.map((token) => `${token.slice(0, 18)}...`),
      queueConfigured: Boolean(this.notificationsQueue),
    };
  }

  async create(
    userId: string,
    title: string,
    message: string,
    organizationId: string,
    type?: string,
    payload?: any,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        organizationId,
        type: type || null,
        payload: payload || undefined,
      },
    });

    // Emit a single canonical real-time event for instant delivery.
    this.trackingGateway.emitNotificationCreated(userId, notification);

    const pushDelivery = await this.deliverPushNotification({
      userId,
      notificationId: notification.id,
      title,
      message,
    });

    return { notification, pushDelivery };
  }

  private isPermanentTokenError(ticket: ExpoPushTicket) {
    const detail = ticket.details?.error;
    const message = ticket.message?.toLowerCase() ?? "";

    return (
      detail === "DeviceNotRegistered" ||
      message.includes("not a valid expo push token")
    );
  }

  private async deliverPushNotification(data: {
    userId: string;
    notificationId: string;
    title: string;
    message: string;
  }): Promise<PushDeliveryResult> {
    if (!this.notificationsQueue) {
      this.logger.warn(
        `Notifications queue is disabled. Sending push directly for user ${data.userId}.`,
      );
      return this.sendPushDirectly(data);
    }

    try {
      await Promise.race([
        this.notificationsQueue.add("send-push", data),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Notifications queue timed out")),
            PUSH_QUEUE_TIMEOUT_MS,
          ),
        ),
      ]);
      const tokenCount = (await this.pushTokensService.getTokens(data.userId))
        .length;
      return { mode: "queue", tokenCount, tickets: [], errors: [] };
    } catch (err: any) {
      this.logger.warn(
        `Push queue unavailable for user ${data.userId}. Falling back to direct Expo push: ${err.message}`,
      );
      return this.sendPushDirectly(data);
    }
  }

  private async sendPushDirectly(data: {
    userId: string;
    notificationId: string;
    title: string;
    message: string;
  }): Promise<PushDeliveryResult> {
    const tokens = await this.pushTokensService.getTokens(data.userId);
    const result: PushDeliveryResult = {
      mode: "direct",
      tokenCount: tokens.length,
      tickets: [],
      errors: [],
    };

    if (tokens.length === 0) {
      this.logger.warn(`No push tokens for user ${data.userId}`);
      result.errors.push("No Expo push tokens are registered for this user.");
      return result;
    }

    for (const token of tokens) {
      try {
        const response = await fetch(EXPO_PUSH_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            to: token,
            title: data.title,
            body: data.message,
            data: { notificationId: data.notificationId },
            sound: "default",
            priority: "high",
          }),
        });
        const responseBody = await response
          .json()
          .catch(() => null as { data?: ExpoPushTicket[] | ExpoPushTicket } | null);

        if (!response.ok) {
          this.logger.warn(
            `Direct Expo push failed for token ${token.slice(0, 10)}...: ${response.status}`,
          );
          result.errors.push(`Expo HTTP ${response.status}`);
          continue;
        }

        const tickets = Array.isArray(responseBody?.data)
          ? responseBody.data
          : responseBody?.data
            ? [responseBody.data]
            : [];
        result.tickets.push(...tickets);

        for (const ticket of tickets) {
          if (ticket.status !== "error") {
            continue;
          }

          this.logger.warn(
            `Direct Expo push ticket error for token ${token.slice(0, 10)}...: ${ticket.details?.error ?? ticket.message ?? "unknown error"}`,
          );

          if (this.isPermanentTokenError(ticket)) {
            await this.pushTokensService.removeToken(token);
          }
          result.errors.push(ticket.details?.error ?? ticket.message ?? "Expo ticket error");
        }
      } catch (err: any) {
        this.logger.error(`Direct Expo push error: ${err.message}`);
        result.errors.push(err.message);
      }
    }

    return result;
  }

  async sendWhatsAppMessage(
    phone: string,
    templateName: string,
    templateData: Record<string, any>,
    organizationId?: string,
  ) {
    this.logger.log(`Queueing WhatsApp (${templateName}) for ${phone}`);

    if (this.whatsappQueue) {
      await this.whatsappQueue.add("send-message", {
        phone,
        templateName,
        templateData,
        timestamp: new Date(),
      });
    } else {
      this.logger.warn(
        `WhatsApp queue is disabled. Skipping message enqueue for ${phone}.`,
      );
    }

    await this.prisma.whatsappMessage.create({
      data: {
        phone,
        message: `Template: ${templateName}`,
        status: "QUEUED",
        organizationId: organizationId || "unknown",
      },
    });
  }

  // ─── CUSTOMER NOTIFICATIONS ─────────────────────────────────────────────

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

  async notifyCustomerNearby(
    phone: string,
    driverName: string,
    etaMinutes: number,
    trackingUrl: string,
    organizationId: string,
  ) {
    await this.sendWhatsAppMessage(
      phone,
      "driver_nearby",
      {
        driverName,
        etaMinutes,
        trackingUrl,
      },
      organizationId,
    );
  }

  // ─── DISPATCHER ALERTS ──────────────────────────────────────────────────

  async alertDispatcher(
    title: string,
    message: string,
    organizationId?: string,
  ) {
    const where: any = { active_status: true };
    if (organizationId) {
      where.organizationId = organizationId;
      where.role = { name: "DISPATCHER", organizationId };
    } else {
      where.role = { name: "DISPATCHER" };
    }
    const dispatchers = await this.prisma.user.findMany({ where });

    for (const dispatcher of dispatchers) {
      await this.create(
        dispatcher.id,
        title,
        message,
        dispatcher.organizationId,
        "DISPATCHER_ALERT",
      );
    }
  }

  async alertAdmins(
    title: string,
    message: string,
    organizationId?: string,
  ) {
    const where: any = { active_status: true };
    if (organizationId) {
      where.organizationId = organizationId;
      where.role = { name: "ADMIN", organizationId };
    } else {
      where.role = { name: "ADMIN" };
    }
    const admins = await this.prisma.user.findMany({ where });

    for (const admin of admins) {
      await this.create(
        admin.id,
        title,
        message,
        admin.organizationId,
        "ADMIN_ALERT",
      );
    }
  }

  async alertDispatchersAndAdmins(
    title: string,
    message: string,
    organizationId?: string,
  ) {
    await this.alertDispatcher(title, message, organizationId);
    await this.alertAdmins(title, message, organizationId);
  }

  // ─── DELIVERY WORKFLOW NOTIFICATIONS ────────────────────────────────────

  async notifyNewDriverAssignment(
    driverUserId: string,
    deliveryNumber: string,
    organizationId: string,
  ) {
    await this.create(
      driverUserId,
      "Nova Entrega",
      `Você foi designado para a entrega #${deliveryNumber}.`,
      organizationId,
      "DELIVERY_ASSIGNED",
    );
  }

  async notifyDriverAcceptedDelivery(
    organizationId: string,
    dispatcherId: string | null,
    deliveryNumber: string,
  ) {
    if (dispatcherId) {
      await this.create(
        dispatcherId,
        "Entrega Aceita",
        `Motorista aceitou a entrega #${deliveryNumber}.`,
        organizationId,
        "DRIVER_ACCEPTED",
      );
    }
  }

  async notifyLoadingStarted(
    organizationId: string,
    dispatcherId: string | null,
    deliveryNumber: string,
  ) {
    if (dispatcherId) {
      await this.create(
        dispatcherId,
        "Carregamento Iniciado",
        `Motorista iniciou carregamento da entrega #${deliveryNumber}.`,
        organizationId,
        "LOADING_STARTED",
      );
    }
  }

  async notifyLoaded(
    organizationId: string,
    dispatcherId: string | null,
    deliveryNumber: string,
  ) {
    if (dispatcherId) {
      await this.create(
        dispatcherId,
        "Carregamento Concluído",
        `Entrega #${deliveryNumber} foi carregada.`,
        organizationId,
        "LOADED",
      );
    }
    await this.alertAdmins(
      "Carregamento Concluído",
      `Entrega #${deliveryNumber} carregada.`,
      organizationId,
    );
  }

  async notifyInTransit(
    organizationId: string,
    dispatcherId: string | null,
    deliveryNumber: string,
  ) {
    if (dispatcherId) {
      await this.create(
        dispatcherId,
        "Em Trânsito",
        `Entrega #${deliveryNumber} está a caminho.`,
        organizationId,
        "IN_TRANSIT",
      );
    }
  }

  async notifyDelivered(
    organizationId: string,
    dispatcherId: string | null,
    deliveryNumber: string,
  ) {
    if (dispatcherId) {
      await this.create(
        dispatcherId,
        "Entrega Concluída",
        `Entrega #${deliveryNumber} foi entregue com sucesso!`,
        organizationId,
        "DELIVERED",
      );
    }
    await this.alertAdmins(
      "Entrega Concluída",
      `Entrega #${deliveryNumber} entregue com sucesso!`,
      organizationId,
    );
  }

  async notifyFailed(
    organizationId: string,
    dispatcherId: string | null,
    deliveryNumber: string,
    reason: string,
  ) {
    if (dispatcherId) {
      await this.create(
        dispatcherId,
        "Falha na Entrega",
        `Entrega #${deliveryNumber} falhou: ${reason}.`,
        organizationId,
        "DELIVERY_FAILED",
      );
    }
    await this.alertAdmins(
      "Falha na Entrega",
      `Entrega #${deliveryNumber} falhou: ${reason}.`,
      organizationId,
    );
  }

  // ─── FUEL NOTIFICATIONS ─────────────────────────────────────────────────

  async notifyFuelRequestCreated(fuelLog: any) {
    this.trackingGateway.notifyDispatchers("fuelRequestCreated", fuelLog);
  }

  async notifyFuelRequestUpdated(fuelLog: any) {
    this.trackingGateway.notifyDispatchers("fuelRequestUpdated", fuelLog);
    if (fuelLog.driver?.userId) {
      this.trackingGateway.notifyUser(fuelLog.driver.userId, "fuelRequestUpdated", fuelLog);
    }
  }

  // ─── EXCEL UPLOAD NOTIFICATIONS ─────────────────────────────────────────

  async notifyExcelUploadSummary(
    organizationId: string,
    adminUserId: string,
    summary: {
      createdDeliveries: number;
      skippedDuplicates: number;
      failedRows: number;
    },
  ) {
    await this.create(
      adminUserId,
      "Upload Excel Concluído",
      `${summary.createdDeliveries} entrega(s) criada(s). ${summary.skippedDuplicates} duplicata(s). ${summary.failedRows} falha(s).`,
      organizationId,
      "EXCEL_UPLOAD",
    );

    await this.alertDispatchersAndAdmins(
      "Novas Entregas via Excel",
      `${summary.createdDeliveries} nova(s) entrega(s) criada(s) via upload Excel.`,
      organizationId,
    );
  }

  // ─── ALERTS ─────────────────────────────────────────────────────────────

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

  async notifyCustomerUnavailable(
    deliveryNumber: string,
    customerName: string,
    customerPhone: string,
    organizationId: string,
  ) {
    await this.alertDispatcher(
      "Cliente Indisponível",
      `Cliente ${customerName} (${customerPhone}) não estará disponível para entrega #${deliveryNumber}.`,
      organizationId,
    );
  }

  async notifyFailedDelivery(
    deliveryNumber: string,
    reason: string,
    driverName: string,
    organizationId: string,
  ) {
    await this.alertDispatcher(
      "Falha na Entrega",
      `Entrega #${deliveryNumber} falhou: ${reason}. Motorista: ${driverName}.`,
      organizationId,
    );
  }

  async notifyVehicleProblem(
    vehicleNumber: string,
    driverName: string,
    problem: string,
    organizationId: string,
  ) {
    await this.alertDispatcher(
      "Problema no Veículo",
      `Veículo ${vehicleNumber} (${driverName}): ${problem}.`,
      organizationId,
    );
  }

  async notifyRouteDelay(
    routeName: string,
    driverName: string,
    delayMinutes: number,
    organizationId: string,
  ) {
    await this.alertDispatcher(
      "Atraso na Rota",
      `Rota ${routeName} (${driverName}) está ${delayMinutes}min atrasada.`,
      organizationId,
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
        `Sua entrega #${deliveryNumber} está atrasada. Chegada estimada era às ${expectedTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
        delivery.organizationId,
        "DELAY_ALERT",
      );
    }
  }
}
