import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateJobSiteDto, UpdateJobSiteDto } from "./dto/create-job-site.dto";

@Injectable()
export class JobSitesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.jobSite.findMany({
      where: { organizationId, deletedAt: null },
      include: { _count: { select: { deliveries: true } } },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const site = await this.prisma.jobSite.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        deliveries: {
          where: { deletedAt: null },
          include: { driver: { include: { user: true } }, customer: true },
          orderBy: { scheduledTime: "desc" },
          take: 20,
        },
        _count: { select: { deliveries: true } },
      },
    });
    if (!site) throw new NotFoundException("Job site not found");
    return site;
  }

  async create(dto: CreateJobSiteDto, organizationId: string) {
    return this.prisma.jobSite.create({
      data: { ...dto, organizationId },
    });
  }

  async update(id: string, dto: UpdateJobSiteDto, organizationId: string) {
    const site = await this.prisma.jobSite.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!site) throw new NotFoundException("Job site not found");
    return this.prisma.jobSite.update({ where: { id }, data: dto });
  }

  async remove(id: string, organizationId: string) {
    const site = await this.prisma.jobSite.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!site) throw new NotFoundException("Job site not found");
    return this.prisma.jobSite.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findByDelivery(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { jobSiteId: true, latitude: true, longitude: true },
    });
    if (!delivery?.jobSiteId) return null;
    return this.prisma.jobSite.findUnique({
      where: { id: delivery.jobSiteId },
    });
  }
}
