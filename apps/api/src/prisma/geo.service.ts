import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class GeoService {
  constructor(private prisma: PrismaService) {}

  async checkInServiceArea(lat: number, lng: number) {
    const zones: any[] = await this.prisma.$queryRaw`
      SELECT id, name FROM "Zone"
      WHERE active = true
      AND ST_Contains(
        ST_GeomFromGeoJSON(polygon::text),
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    `;
    return zones.length > 0;
  }

  async checkGeofenceAlert(driverId: string, lat: number, lng: number) {
    // Spatial check for geofences
    const geofences: any[] = await this.prisma.$queryRaw`
      SELECT id, name FROM "Geofence"
      WHERE active = true
      AND ST_Contains(
        ST_GeomFromGeoJSON(polygon::text),
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    `;
    return geofences;
  }
}
