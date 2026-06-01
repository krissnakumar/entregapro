import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { PlanService } from "./plan.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("plans")
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  findAll() {
    return this.planService.findAll();
  }

  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.planService.findBySlug(slug);
  }
}
