import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException("Organization slug already exists");
    }
    return this.prisma.organization.create({ data: dto });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            drivers: true,
            vehicles: true,
            customers: true,
            deliveries: true,
          },
        },
      },
    });
    if (!org || org.deletedAt) {
      throw new NotFoundException("Organization not found");
    }
    return org;
  }

  async findBySlug(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (!org || org.deletedAt) {
      throw new NotFoundException("Organization not found");
    }
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const org = await this.findById(id);
    if (dto.slug && dto.slug !== org.slug) {
      const existing = await this.prisma.organization.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException("Organization slug already exists");
      }
    }
    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
