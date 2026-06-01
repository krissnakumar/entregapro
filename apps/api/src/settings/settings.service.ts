import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { randomUUID } from "crypto";

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(organizationId?: string) {
    const rows = await this.prisma.systemSetting.findMany({
      where: organizationId ? { organizationId } : undefined,
      select: { key: true, value: true },
    });
    const result: Record<string, any> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async set(key: string, value: any, organizationId?: string) {
    return this.prisma.$executeRawUnsafe(
      `INSERT INTO "SystemSetting" ("id", "key", "value", "organizationId", "updatedAt", "createdAt")
       VALUES ($1, $2, $3::jsonb, $4, NOW(), NOW())
       ON CONFLICT ("key")
       DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()`,
      randomUUID(),
      key,
      JSON.stringify(value),
      organizationId || null,
    );
  }
}
