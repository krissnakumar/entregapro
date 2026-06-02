import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AssignmentService } from "./assignment.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("assignment")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentController {
  constructor(private readonly service: AssignmentService) {}

  @Post("run")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  runAssignment(@Req() req: any) {
    return this.service.runAssignment(req.user.organizationId);
  }
}
