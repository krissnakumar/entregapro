import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseGuards, OnModuleDestroy } from "@nestjs/common";
import { WsJwtGuard } from "../auth/guards/ws-jwt.guard";
import { PrismaService } from "../prisma/prisma.service";
import { GeoService } from "../prisma/geo.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

let ghostInterval: ReturnType<typeof setInterval> | null = null;

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

@WebSocketGateway({
  cors: {
    origin:
      ALLOWED_ORIGINS.length > 0
        ? ALLOWED_ORIGINS
        : (origin, cb) => {
            if (process.env.NODE_ENV === "development") cb(null, true);
            else cb(new Error("Not allowed by CORS"));
          },
  },
})
@UseGuards(WsJwtGuard)
export class TrackingGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  private activeDrivers = new Map<string, string>(); // driverId -> socketId
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private prisma: PrismaService,
    private geoService: GeoService,
    @InjectQueue("location-tracking") private trackingQueue: Queue,
  ) {}

  private lastGhostCleanup = 0;

  afterInit() {
    ghostInterval = setInterval(() => {
      let foundGhost = false;
      for (const [driverId, socketId] of this.activeDrivers.entries()) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (!socket || !socket.connected) {
          this.logger.warn(
            `Ghost connection cleaned up: driver ${driverId} (socket ${socketId})`,
          );
          this.activeDrivers.delete(driverId);
          this.server
            .to("dispatchers")
            .emit("driverStatusChanged", { driverId, status: "offline" });
          foundGhost = true;
          this.prisma.driver
            .update({
              where: { id: driverId },
              data: { isOnline: false, lastSeen: new Date() },
            })
            .catch((err: Error) =>
              this.logger.error(`Ghost cleanup DB failed: ${err.message}`),
            );
        }
      }
      if (!foundGhost) {
        this.logger.debug("Ghost cleanup: no ghosts found, skipping DB write");
      }
    }, 30_000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    const userId =
      (client as any).data?.user?.sub || (client as any).data?.user?.userId;
    const role = (client as any).data?.user?.role;
    const organizationId = (client as any).data?.user?.organizationId;

    if (userId) {
      client.join(`user_${userId}`);
      const sockets = this.userSockets.get(userId) || new Set();
      sockets.add(client.id);
      this.userSockets.set(userId, sockets);

      // Auto-join role-based rooms
      if (role === "DISPATCHER") {
        client.join("dispatchers");
        client.join(`dispatcher_${userId}`);
      }
      if (role === "ADMIN" || role === "SUPER_ADMIN") {
        client.join(`admin_${userId}`);
      }
      if (role === "DRIVER" || role === "HELPER") {
        client.join(`driver_${userId}`);
      }

      // Auto-join organization room
      if (organizationId) {
        client.join(`organization_${organizationId}`);
      }
    }

    client.on("error", (err: Error) => {
      this.logger.error(`Socket error for ${client.id}: ${err.message}`);
      client.disconnect(true);
    });

    client.on("close", () => {
      this.logger.log(`Socket closed: ${client.id}`);
    });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.delete(client.id) && sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    for (const [driverId, socketId] of this.activeDrivers.entries()) {
      if (socketId === client.id) {
        this.activeDrivers.delete(driverId);
        this.server
          .to("dispatchers")
          .emit("driverStatusChanged", { driverId, status: "offline" });
        await this.prisma.driver
          .update({
            where: { id: driverId },
            data: { isOnline: false, lastSeen: new Date() },
          })
          .catch((err: Error) =>
            this.logger.error(`Failed to persist disconnect: ${err.message}`),
          );
        break;
      }
    }
  }

  // ─── Public API for other services ──────────────────────────────────────

  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
    this.logger.debug(`Emitted ${event} to user_${userId}`);
  }

  notifyDispatchers(event: string, data: any) {
    this.server.to("dispatchers").emit(event, data);
  }

  notifyAdmins(organizationId: string, event: string, data: any) {
    this.server.to(`organization_${organizationId}`).emit(event, data);
  }

  notifyOrganization(organizationId: string, event: string, data: any) {
    this.server.to(`organization_${organizationId}`).emit(event, data);
  }

  notifyDelivery(deliveryId: string, event: string, data: any) {
    this.server.to(`delivery_${deliveryId}`).emit(event, data);
  }

  notifyLoadBatch(loadBatchId: string, event: string, data: any) {
    this.server.to(`loadBatch_${loadBatchId}`).emit(event, data);
  }

  // ─── Delivery workflow events ───────────────────────────────────────────

  emitDeliveryCreated(organizationId: string, delivery: any) {
    this.notifyOrganization(organizationId, "delivery.created", delivery);
  }

  emitDeliveryAssigned(organizationId: string, delivery: any, driverUserId: string) {
    this.notifyOrganization(organizationId, "delivery.assigned", delivery);
    if (driverUserId) {
      this.notifyUser(driverUserId, "delivery.assigned", delivery);
    }
  }

  emitDriverAccepted(organizationId: string, delivery: any) {
    this.notifyOrganization(organizationId, "driver.accepted", delivery);
  }

  emitDeliveryLoadingStarted(organizationId: string, delivery: any) {
    this.notifyOrganization(organizationId, "delivery.loading_started", delivery);
  }

  emitDeliveryLoaded(organizationId: string, delivery: any) {
    this.notifyOrganization(organizationId, "delivery.loaded", delivery);
  }

  emitDeliveryInTransit(organizationId: string, delivery: any) {
    this.notifyOrganization(organizationId, "delivery.in_transit", delivery);
  }

  emitDeliveryArrived(organizationId: string, delivery: any) {
    this.notifyOrganization(organizationId, "delivery.arrived", delivery);
  }

  emitDeliveryDelivered(organizationId: string, delivery: any) {
    this.notifyOrganization(organizationId, "delivery.delivered", delivery);
  }

  emitDeliveryFailed(organizationId: string, delivery: any) {
    this.notifyOrganization(organizationId, "delivery.failed", delivery);
  }

  emitFuelRequested(organizationId: string, request: any) {
    this.notifyOrganization(organizationId, "fuel.requested", request);
  }

  emitFuelApproved(organizationId: string, request: any, driverUserId: string) {
    this.notifyOrganization(organizationId, "fuel.approved", request);
    if (driverUserId) {
      this.notifyUser(driverUserId, "fuel.approved", request);
    }
  }

  emitFuelRejected(organizationId: string, request: any, driverUserId: string) {
    this.notifyOrganization(organizationId, "fuel.rejected", request);
    if (driverUserId) {
      this.notifyUser(driverUserId, "fuel.rejected", request);
    }
  }

  emitNotificationCreated(userId: string, notification: any) {
    this.notifyUser(userId, "notification.created", notification);
  }

  // ─── Socket message handlers ────────────────────────────────────────────

  @SubscribeMessage("updateLocation")
  async handleUpdateLocation(
    @MessageBody()
    data: {
      deliveryId: string;
      lat: number;
      lng: number;
      driverId: string;
      speed?: number;
      heading?: number;
      batteryLevel?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).data?.user;
    const organizationId = user?.organizationId;

    const existingSocketId = this.activeDrivers.get(data.driverId);

    const dbUpdate =
      existingSocketId !== client.id
        ? { isOnline: true, lastSeen: new Date() }
        : { lastSeen: new Date() };

    if (existingSocketId !== client.id) {
      const isNewlyOnline = !existingSocketId;
      this.activeDrivers.set(data.driverId, client.id);

      if (isNewlyOnline) {
        this.server.to("dispatchers").emit("driverStatusChanged", {
          driverId: data.driverId,
          status: "online",
        });
      }
    }

    this.prisma.driver
      .update({
        where: { id: data.driverId },
        data: dbUpdate,
      })
      .catch((err: Error) =>
        this.logger.error(`Failed to persist driver status: ${err.message}`),
      );

    await this.trackingQueue.add("process-location", {
      ...data,
      organizationId,
    });

    this.server.to(`delivery_${data.deliveryId}`).emit("locationUpdated", data);
    this.server.to("dispatchers").emit("driverLocationUpdated", data);

    if (data.lat && data.lng) {
      const alerts = await this.geoService.checkGeofenceAlert(
        data.driverId,
        data.lat,
        data.lng,
      );
      if (alerts.length > 0) {
        this.server.to("dispatchers").emit("geofenceAlert", {
          driverId: data.driverId,
          alerts,
          timestamp: new Date(),
        });
      }
    }
  }

  onModuleDestroy() {
    if (ghostInterval) {
      clearInterval(ghostInterval);
      ghostInterval = null;
    }
  }

  @SubscribeMessage("joinDelivery")
  handleJoinDelivery(
    @MessageBody() deliveryId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`delivery_${deliveryId}`);
    return { event: "joined", data: deliveryId };
  }

  @SubscribeMessage("joinDispatchers")
  handleJoinDispatchers(@ConnectedSocket() client: Socket) {
    client.join("dispatchers");
    const onlineDrivers = Array.from(this.activeDrivers.keys());
    return { event: "joined", data: { room: "dispatchers", onlineDrivers } };
  }

  @SubscribeMessage("joinUser")
  handleJoinUser(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!userId) return;
    client.join(`user_${userId}`);
    const sockets = this.userSockets.get(userId) || new Set();
    sockets.add(client.id);
    this.userSockets.set(userId, sockets);
    return { event: "joined", data: { room: `user_${userId}` } };
  }

  @SubscribeMessage("joinOrganization")
  handleJoinOrganization(
    @MessageBody() organizationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!organizationId) return;
    client.join(`organization_${organizationId}`);
    return { event: "joined", data: { room: `organization_${organizationId}` } };
  }

  @SubscribeMessage("joinLoadBatch")
  handleJoinLoadBatch(
    @MessageBody() loadBatchId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!loadBatchId) return;
    client.join(`loadBatch_${loadBatchId}`);
    return { event: "joined", data: { room: `loadBatch_${loadBatchId}` } };
  }

  @SubscribeMessage("joinDriver")
  handleJoinDriver(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!userId) return;
    client.join(`driver_${userId}`);
    return { event: "joined", data: { room: `driver_${userId}` } };
  }
}
