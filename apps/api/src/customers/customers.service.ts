import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.customer.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { deliveries: true },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async create(data: any) {
    const lat = data.latitude !== undefined && data.latitude !== null ? parseFloat(data.latitude) : NaN;
    const lng = data.longitude !== undefined && data.longitude !== null ? parseFloat(data.longitude) : NaN;
    
    return this.prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        whatsapp: data.whatsapp,
        address: data.address,
        latitude: isNaN(lat) ? -23.5505 : lat,
        longitude: isNaN(lng) ? -46.6333 : lng,
        notes: data.notes,
        organizationId: data.organizationId,
      },
    });
  }

  async update(id: string, organizationId: string, data: any) {
    const updateData: any = {
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp,
      address: data.address,
      notes: data.notes,
    };

    if (data.latitude !== undefined && data.latitude !== null) {
      const parsedLat = parseFloat(data.latitude);
      if (!isNaN(parsedLat)) {
        updateData.latitude = parsedLat;
      }
    }

    if (data.longitude !== undefined && data.longitude !== null) {
      const parsedLng = parseFloat(data.longitude);
      if (!isNaN(parsedLng)) {
        updateData.longitude = parsedLng;
      }
    }

    const res = await this.prisma.customer.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: updateData,
    });
    if (res.count === 0) throw new NotFoundException("Customer not found");
    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string) {
    const res = await this.prisma.customer.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) throw new NotFoundException("Customer not found");
    return { success: true };
  }
}
