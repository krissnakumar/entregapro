import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    // Try to find as an Order first, then fall back to Delivery
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        deliveries: {
          include: {
            customer: true,
            vehicle: true,
            driver: {
              include: {
                user: true,
                vehicle: true,
              },
            },
          },
        },
      },
    });

    if (order) {
      const delivery = order.deliveries?.[0];
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: delivery?.status || "PENDING",
        eta_minutes: 24,
        customerAddress: delivery?.deliveryAddress || delivery?.customer?.address || "",
        materialType: delivery?.materialType || "",
        quantity: delivery?.quantity || "",
        driver: delivery?.driver
          ? {
              user: {
                name: delivery.driver.user?.name || "Motorista",
                phone: delivery.driver.user?.phone || "",
              },
              vehicle: delivery.vehicle
                ? {
                    vehicleNumber: delivery.vehicle.vehicleNumber || "",
                  }
                : null,
            }
          : null,
      };
    }

    // Fallback: try as a Delivery directly
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        driver: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
    });

    if (delivery) {
      return {
        id: delivery.id,
        orderNumber: delivery.deliveryNumber,
        status: delivery.status,
        eta_minutes: 24,
        customerAddress: delivery.deliveryAddress || delivery.customer?.address || "",
        materialType: delivery.materialType || "",
        quantity: delivery.quantity || "",
        driver: delivery.driver
          ? {
              user: {
                name: delivery.driver.user?.name || "Motorista",
                phone: delivery.driver.user?.phone || "",
              },
              vehicle: delivery.vehicle
                ? {
                    vehicleNumber: delivery.vehicle.vehicleNumber || "",
                  }
                : null,
            }
          : null,
      };
    }

    return null;
  }
}
