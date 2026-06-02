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

  /**
   * Periodic heartbeat to detect and clean up stale/ghost connections.
   * Runs every 30 seconds — only writes to DB when ghost connections are found.
   */
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

    // Extract user info from the authenticated socket (set by WsJwtGuard)
    const userId =
      (client as any).data?.user?.sub || (client as any).data?.user?.userId;
    if (userId) {
      client.join(`user_${userId}`);
      const sockets = this.userSockets.get(userId) || new Set();
      sockets.add(client.id);
      this.userSockets.set(userId, sockets);
    }

    // Handle socket errors
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

    // Clean up from userSockets
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.delete(client.id) && sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Clean up from activeDrivers
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

    // 1. Live status management
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

    // Batch DB write: fire but log errors, don't block the flow
    this.prisma.driver
      .update({
        where: { id: data.driverId },
        data: dbUpdate,
      })
      .catch((err: Error) =>
        this.logger.error(`Failed to persist driver status: ${err.message}`),
      );

    // 2. Offload to background queue for persistence and heavy processing
    await this.trackingQueue.add("process-location", {
      ...data,
      organizationId,
    });

    // 3. Instant feedback to watchers
    this.server.to(`delivery_${data.deliveryId}`).emit("locationUpdated", data);
    this.server.to("dispatchers").emit("driverLocationUpdated", data);

    // 4. Geofence checking (only if we have coordinates)
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
}
