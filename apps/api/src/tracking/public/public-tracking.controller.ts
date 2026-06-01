import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { PublicTrackingService } from "./public-tracking.service";
import { Public } from "../../auth/decorators/public.decorator";
import { Throttle } from "@nestjs/throttler";

@Controller("tracking")
export class PublicTrackingController {
  constructor(private readonly publicTrackingService: PublicTrackingService) {}

  @Get("public/:id")
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getDelivery(@Param("id") id: string) {
    return this.publicTrackingService.getDeliveryTracking(id);
  }

  @Get("by-document")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async getByDocument(@Query("doc") document: string) {
    if (!document || document.length < 3) {
      return [];
    }
    return this.publicTrackingService.getDeliveriesByDocument(document);
  }
}
