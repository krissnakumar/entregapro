import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    options?: {
      take?: number;
      skip?: number;
      category?: string;
      search?: string;
      brand?: string;
      qualityGrade?: string;
      active?: boolean;
    },
  ) {
    const take = options?.take ?? 50;
    const skip = options?.skip ?? 0;

    const where: any = { organizationId, deletedAt: null };

    if (options?.category) {
      where.category = options.category;
    }
    if (options?.brand) {
      where.brand = options.brand;
    }
    if (options?.qualityGrade) {
      where.qualityGrade = options.qualityGrade;
    }
    if (options?.active !== undefined) {
      where.active = options.active;
    }
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { sku: { contains: options.search, mode: "insensitive" } },
        { description: { contains: options.search, mode: "insensitive" } },
        { brand: { contains: options.search, mode: "insensitive" } },
        { supplier: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take,
        skip,
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, take, skip };
  }

  async findOne(id: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async findBySku(sku: string, organizationId: string) {
    const product = await this.prisma.product.findFirst({
      where: { sku, organizationId, deletedAt: null },
    });
    if (!product) throw new NotFoundException(`Product with SKU ${sku} not found`);
    return product;
  }

  async getCategories(organizationId: string) {
    const categories = await this.prisma.product.groupBy({
      by: ["category"],
      where: { organizationId, deletedAt: null, active: true },
      _count: { id: true },
      orderBy: { category: "asc" },
    });

    return categories.map((c) => ({
      category: c.category,
      count: c._count.id,
    }));
  }

  async getBrands(organizationId: string) {
    const brands = await this.prisma.product.groupBy({
      by: ["brand"],
      where: {
        organizationId,
        deletedAt: null,
        active: true,
        brand: { not: null },
      },
      _count: { id: true },
      orderBy: { brand: "asc" },
    });

    return brands.map((b) => ({
      brand: b.brand,
      count: b._count.id,
    }));
  }

  async create(data: {
    name: string;
    sku?: string;
    category: string;
    subcategory?: string;
    unit?: string;
    weightPerUnit?: number;
    volumePerUnit?: number;
    unitPrice?: number;
    brand?: string;
    supplier?: string;
    description?: string;
    certification?: string;
    qualityGrade?: string;
    minStorageTemp?: number;
    maxStorageTemp?: number;
    shelfLifeDays?: number;
    isFragile?: boolean;
    requiresSpecialHandling?: boolean;
    organizationId: string;
  }) {
    // Check for duplicate name within organization
    const existing = await this.prisma.product.findUnique({
      where: {
        name_organizationId: {
          name: data.name,
          organizationId: data.organizationId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Product "${data.name}" already exists in this organization.`,
      );
    }

    return this.prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku || null,
        category: data.category,
        subcategory: data.subcategory || null,
        unit: data.unit || "un",
        weightPerUnit: data.weightPerUnit ?? null,
        volumePerUnit: data.volumePerUnit ?? null,
        unitPrice: data.unitPrice ?? null,
        brand: data.brand || null,
        supplier: data.supplier || null,
        description: data.description || null,
        certification: data.certification || null,
        qualityGrade: data.qualityGrade || null,
        minStorageTemp: data.minStorageTemp ?? null,
        maxStorageTemp: data.maxStorageTemp ?? null,
        shelfLifeDays: data.shelfLifeDays ?? null,
        isFragile: data.isFragile ?? false,
        requiresSpecialHandling: data.requiresSpecialHandling ?? false,
        organizationId: data.organizationId,
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<{
      name: string;
      sku: string;
      category: string;
      subcategory: string;
      unit: string;
      weightPerUnit: number;
      volumePerUnit: number;
      unitPrice: number;
      brand: string;
      supplier: string;
      description: string;
      certification: string;
      qualityGrade: string;
      minStorageTemp: number;
      maxStorageTemp: number;
      shelfLifeDays: number;
      isFragile: boolean;
      requiresSpecialHandling: boolean;
      active: boolean;
    }>,
  ) {
    const res = await this.prisma.product.updateMany({
      where: { id, organizationId, deletedAt: null },
      data,
    });
    if (res.count === 0) throw new NotFoundException("Product not found");
    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string) {
    const res = await this.prisma.product.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) throw new NotFoundException("Product not found");
    return { success: true };
  }
}
