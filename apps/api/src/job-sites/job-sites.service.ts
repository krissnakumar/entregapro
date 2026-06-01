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
    const res = await this.prisma.jobSite.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: dto,
    });
    if (res.count === 0) throw new NotFoundException("Job site not found");
    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string) {
    const res = await this.prisma.jobSite.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) throw new NotFoundException("Job site not found");
    return { success: true };
  }

  async findByDelivery(deliveryId: string, organizationId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, organizationId, deletedAt: null },
      select: { jobSiteId: true, latitude: true, longitude: true },
    });
    if (!delivery?.jobSiteId) return null;
    return this.prisma.jobSite.findFirst({
      where: { id: delivery.jobSiteId, organizationId, deletedAt: null },
    });
  }
}
