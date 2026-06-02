import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(private prisma: PrismaService) {}

  async getRoutes(token: string) {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        status: { in: ["IN_TRANSIT" as any, "ASSIGNED" as any] },
        driverId: { not: null },
      },
      include: {
        driver: { include: { user: true } },
        customer: true,
        vehicle: true,
      },
    });

    return deliveries
      .filter((d) => d.driverId && d.latitude && d.longitude)
      .map((d) => {
        const originLat = d.driver?.liveLatitude ?? -23.5505;
        const originLng = d.driver?.liveLongitude ?? -46.6333;
        const destLat = d.latitude;
        const destLng = d.longitude;
        const steps = 40;
        const waypoints: { lat: number; lng: number }[] = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          waypoints.push({
            lat: originLat + (destLat - originLat) * t,
            lng: originLng + (destLng - originLng) * t,
          });
        }
        return {
          driverId: d.driverId,
          deliveryId: d.id,
          deliveryNumber: d.deliveryNumber,
          driverName: d.driver?.user?.name ?? "Desconhecido",
          vehicleNumber: d.vehicle?.vehicleNumber ?? null,
          customerName: d.customer?.name ?? null,
          originLat,
          originLng,
          destLat,
          destLng,
          waypoints,
          totalSteps: steps,
        };
      });
  }
}
