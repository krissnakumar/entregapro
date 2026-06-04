import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { RouteOptimizationService } from './route-optimization.service';

@Controller('route-optimization')
export class RouteOptimizationController {
  constructor(private readonly routeOptimizationService: RouteOptimizationService) {}

  @Post('optimize')
  async optimizeRoute(
    @Body() body: { stops: Array<{ id: string; lat: number; lng: number; label?: string }>; depot?: { lat: number; lng: number } },
  ) {
    const stops = body.stops.map((s) => ({
      id: s.id,
      coordinates: { lat: s.lat, lng: s.lng },
      label: s.label,
    }));

    const depot = body.depot ? { lat: body.depot.lat, lng: body.depot.lng } : undefined;

    return this.routeOptimizationService.optimizeRoute(stops, depot);
  }

  @Get('distance')
  async getDistance(
    @Query('lat1') lat1: string,
    @Query('lng1') lng1: string,
    @Query('lat2') lat2: string,
    @Query('lng2') lng2: string,
  ) {
    const distance = this.routeOptimizationService.haversineDistance(
      { lat: parseFloat(lat1), lng: parseFloat(lng1) },
      { lat: parseFloat(lat2), lng: parseFloat(lng2) },
    );
    return { distanceKm: Math.round(distance * 10) / 10 };
  }
}
