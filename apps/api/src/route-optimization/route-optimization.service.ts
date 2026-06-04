import { Injectable, Logger } from '@nestjs/common';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteStop {
  id: string;
  coordinates: Coordinates;
  label?: string;
}

export interface OptimizedRoute {
  orderedStops: RouteStop[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  segments: RouteSegment[];
  algorithm: 'osrm' | 'nearest-neighbor';
}

export interface RouteSegment {
  from: string;
  to: string;
  distanceKm: number;
  durationMinutes: number;
}

@Injectable()
export class RouteOptimizationService {
  private readonly logger = new Logger(RouteOptimizationService.name);
  private readonly OSRM_BASE_URL = 'http://router.project-osrm.org';

  async optimizeRoute(
    stops: RouteStop[],
    depot?: Coordinates,
  ): Promise<OptimizedRoute> {
    if (stops.length === 0) {
      return {
        orderedStops: [],
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        segments: [],
        algorithm: 'nearest-neighbor',
      };
    }

    if (stops.length === 1) {
      return {
        orderedStops: stops,
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        segments: [],
        algorithm: 'nearest-neighbor',
      };
    }

    try {
      return await this.optimizeWithOsrm(stops, depot);
    } catch (error) {
      this.logger.warn(`OSRM failed, falling back to nearest-neighbor: ${error.message}`);
      return this.optimizeWithNearestNeighbor(stops, depot);
    }
  }

  private async optimizeWithOsrm(
    stops: RouteStop[],
    depot?: Coordinates,
  ): Promise<OptimizedRoute> {
    const coordinates: Coordinates[] = [];

    if (depot) {
      coordinates.push(depot);
    } else {
      coordinates.push(stops[0].coordinates);
    }

    stops.forEach((stop) => {
      const isDepot = depot
        ? stop.coordinates.lat === depot.lat && stop.coordinates.lng === depot.lng
        : stop.coordinates.lat === coordinates[0].lat && stop.coordinates.lng === coordinates[0].lng;
      if (!isDepot) {
        coordinates.push(stop.coordinates);
      }
    });

    const coordsStr = coordinates.map((c) => `${c.lng},${c.lat}`).join(';');
    const url = `${this.OSRM_BASE_URL}/trip/v1/driving/${coordsStr}?source=first&roundtrip=false&overview=false&annotations=distance,duration`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OSRM returned ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.trips?.[0]) {
      throw new Error(`OSRM optimization failed: ${data.code}`);
    }

    const trip = data.trips[0];
    const waypointOrder = data.waypoints.map((wp: any) => wp.waypoint_index);

    const allStops = [stops[0], ...stops.slice(1)];
    const orderedStops = waypointOrder
      .filter((idx: number) => idx > 0 || !depot)
      .map((idx: number) => allStops[idx] || stops[0]);

    const dedupedStops = orderedStops.filter(
      (stop, index, arr) =>
        arr.findIndex((s) => s.id === stop.id) === index,
    );

    const segments: RouteSegment[] = [];
    for (let i = 0; i < dedupedStops.length - 1; i++) {
      const from = dedupedStops[i];
      const to = dedupedStops[i + 1];
      const dist = this.haversineDistance(from.coordinates, to.coordinates);
      segments.push({
        from: from.id,
        to: to.id,
        distanceKm: dist,
        durationMinutes: (dist / 50) * 60,
      });
    }

    const totalDistanceKm = segments.reduce((sum, s) => sum + s.distanceKm, 0);
    const totalDurationMinutes = trip.duration / 60;

    return {
      orderedStops: dedupedStops,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationMinutes: Math.round(totalDurationMinutes),
      segments,
      algorithm: 'osrm',
    };
  }

  private optimizeWithNearestNeighbor(
    stops: RouteStop[],
    depot?: Coordinates,
  ): OptimizedRoute {
    const remaining = [...stops];
    const ordered: RouteStop[] = [];

    let current: Coordinates = depot || remaining[0].coordinates;
    if (!depot && remaining.length > 0) {
      const first = remaining.shift()!;
      ordered.push(first);
      current = first.coordinates;
    }

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = this.haversineDistance(current, remaining[i].coordinates);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const nearest = remaining.splice(nearestIdx, 1)[0];
      ordered.push(nearest);
      current = nearest.coordinates;
    }

    const segments: RouteSegment[] = [];
    for (let i = 0; i < ordered.length - 1; i++) {
      const dist = this.haversineDistance(
        ordered[i].coordinates,
        ordered[i + 1].coordinates,
      );
      segments.push({
        from: ordered[i].id,
        to: ordered[i + 1].id,
        distanceKm: Math.round(dist * 10) / 10,
        durationMinutes: Math.round((dist / 50) * 60),
      });
    }

    const totalDistanceKm = segments.reduce((sum, s) => sum + s.distanceKm, 0);
    const totalDurationMinutes = segments.reduce((sum, s) => sum + s.durationMinutes, 0);

    return {
      orderedStops: ordered,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalDurationMinutes,
      segments,
      algorithm: 'nearest-neighbor',
    };
  }

  haversineDistance(a: Coordinates, b: Coordinates): number {
    const R = 6371;
    const dLat = this.toRad(b.lat - a.lat);
    const dLng = this.toRad(b.lng - a.lng);
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(a.lat)) *
        Math.cos(this.toRad(b.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async getRouteGeometry(
    coordinates: Coordinates[],
  ): Promise<Coordinates[]> {
    if (coordinates.length < 2) return coordinates;

    const coordsStr = coordinates.map((c) => `${c.lng},${c.lat}`).join(';');
    const url = `${this.OSRM_BASE_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) return coordinates;

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return coordinates;

    return data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => ({ lat, lng }),
    );
  }
}
