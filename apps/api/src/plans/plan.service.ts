import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async findBySlug(slug: string) {
    const plan = await this.prisma.plan.findUnique({ where: { slug } });
    if (!plan) throw new NotFoundException("Plan not found");
    return plan;
  }

  async findById(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Plan not found");
    return plan;
  }
}
