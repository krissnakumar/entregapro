import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { User } from "@prisma/client";
import * as argon2 from "argon2";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private mapUserForClient(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || undefined,
      avatarUrl: user.avatarUrl || undefined,
      role: user.role?.name || "DRIVER",
      permissions:
        user.role?.permissions?.map((p: any) => p.permission.key) || [],
      active_status: user.active_status,
      organizationId: user.organizationId,
      created_at: user.created_at,
      updatedAt: user.updatedAt,
      last_login: user.last_login,
    };
  }

  async findOne(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async findOneById(id: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async create(data: any): Promise<User> {
    const hashedPassword = await argon2.hash(
      data.password || data.password_hash || "123456",
    );
    const { password, role, permissions, ...rest } = data;
    let role_id = rest.role_id;
    if (!role_id && role) {
      const existingRole = await this.prisma.role.findFirst({
        where: { name: role, organizationId: rest.organizationId },
      });
      role_id = existingRole?.id;
    }
    return this.prisma.user.create({
      data: {
        ...rest,
        role_id,
        password_hash: hashedPassword,
      },
    });
  }

  async findAll(organizationId?: string): Promise<any[]> {
    const where: any = { deletedAt: null };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    const users = await this.prisma.user.findMany({
      where,
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return users.map((u) => this.mapUserForClient(u));
  }

  async update(id: string, data: any): Promise<any> {
    if (data.role) {
      const role = await this.prisma.role.findFirst({
        where: { name: data.role, organizationId: data.organizationId },
      });
      data.role_id = role?.id || null;
      delete data.role;
    }
    delete data.permissions;

    if (data.password || data.password_hash) {
      data.password_hash = await argon2.hash(
        (data.password || data.password_hash) as string,
      );
      delete data.password;
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
    return this.mapUserForClient(updated);
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
