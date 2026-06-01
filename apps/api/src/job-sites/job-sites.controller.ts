import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Req, UseGuards,
} from "@nestjs/common";
import { JobSitesService } from "./job-sites.service";
import { CreateJobSiteDto, UpdateJobSiteDto } from "./dto/create-job-site.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";

@Controller("job-sites")
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobSitesController {
  constructor(private readonly jobSitesService: JobSitesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  findAll(@Req() req: any) {
    return this.jobSitesService.findAll(req.user.organizationId);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.DRIVER)
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.jobSitesService.findOne(id, req.user.organizationId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateJobSiteDto, @Req() req: any) {
    return this.jobSitesService.create(dto, req.user.organizationId);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateJobSiteDto, @Req() req: any) {
    return this.jobSitesService.update(id, dto, req.user.organizationId);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string, @Req() req: any) {
    return this.jobSitesService.remove(id, req.user.organizationId);
  }
}
