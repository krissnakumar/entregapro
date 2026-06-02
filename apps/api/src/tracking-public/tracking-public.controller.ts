import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Req } from "@nestjs/common";
import { TrackingPublicService } from "./tracking-public.service";
import { Public } from "../auth/decorators/public.decorator";

@Controller()
export class TrackingPublicController {
  constructor(private readonly service: TrackingPublicService) {}

  @Public()
  @Get("track/:token")
  async trackDelivery(@Param("token") token: string) {
    return this.service.getDeliveryByToken(token);
  }

  @Public()
  @Post("track/:token/instructions")
  async saveInstructions(
    @Param("token") token: string,
    @Body() body: {
      gateCode?: string;
      buildingAccess?: string;
      apartmentNumber?: string;
      contactPerson?: string;
      loadingNotes?: string;
      preferredEntrance?: string;
      notes?: string;
    },
  ) {
    return this.service.saveInstructions(token, body);
  }

  @Public()
  @Post("track/:token/availability")
  async confirmAvailability(
    @Param("token") token: string,
    @Body() body: { isAvailable: boolean; notes?: string },
  ) {
    return this.service.confirmAvailability(token, body.isAvailable, body.notes);
  }

  @Public()
  @Post("track/:token/callback")
  async requestCallback(@Param("token") token: string) {
    return this.service.requestCallback(token);
  }

  @Public()
  @Post("track/:token/reschedule")
  async requestReschedule(
    @Param("token") token: string,
    @Body() body: { suggestedDate?: string },
  ) {
    return this.service.requestReschedule(token, body.suggestedDate);
  }
}
