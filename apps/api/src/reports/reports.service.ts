import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDailyDeliveries(date: string, organizationId: string) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    return this.prisma.delivery.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        organizationId,
      },
      include: {
        customer: true,
        driver: { include: { user: true } },
      },
    });
  }

  async getDriverPerformance(organizationId: string) {
    const drivers = await this.prisma.driver.findMany({
      where: { organizationId },
      include: {
        user: true,
        deliveries: {
          select: { status: true },
        },
      },
    });

    return drivers.map((driver: any) => ({
      id: driver.id,
      name: driver.user?.name || "Desconhecido",
      totalDeliveries: driver.deliveries.length,
      completedDeliveries: driver.deliveries.filter(
        (d: any) => d.status === "DELIVERED",
      ).length,
    }));
  }

  async getVehicleUtilization(organizationId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { organizationId },
      include: {
        _count: { select: { deliveries: true } },
      },
    });

    return vehicles.map((vehicle: any) => ({
      id: vehicle.id,
      number: vehicle.vehicleNumber,
      type: vehicle.type,
      usageCount: vehicle._count.deliveries,
      status: vehicle.activeStatus ? "Active" : "Maintenance",
    }));
  }

  async getDelayedDeliveries(organizationId: string) {
    return this.prisma.delivery.findMany({
      where: {
        status: { notIn: ["DELIVERED", "CANCELLED"] },
        scheduledTime: { lt: new Date() },
        organizationId,
      },
      include: { customer: true },
    });
  }

  async getWeeklyStats(organizationId: string) {
    const stats: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setUTCHours(23, 59, 59, 999);

      const count = await this.prisma.delivery.count({
        where: {
          createdAt: { gte: start, lte: end },
          status: "DELIVERED",
          organizationId,
        },
      });

      stats.push({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        deliveries: count,
      });
    }
    return stats;
  }

  async getFinancialReport(organizationId: string) {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        organizationId,
        deletedAt: null,
        estimated_profit: { not: null },
      },
      select: {
        id: true,
        estimated_profit: true,
        delivery_margin_percentage: true,
        total_km: true,
        expected_fuel_cost: true,
        driver_cost: true,
        assistant_cost: true,
        maintenance_cost: true,
        toll_cost: true,
        status: true,
        createdAt: true,
      },
    });

    const totalRevenue = deliveries.reduce(
      (s, d: any) => s + (d.estimated_profit || 0) + this._totalCost(d),
      0,
    );
    const totalCost = deliveries.reduce(
      (s, d: any) => s + this._totalCost(d),
      0,
    );
    const totalProfit = deliveries.reduce(
      (s, d: any) => s + (d.estimated_profit || 0),
      0,
    );
    const avgMargin =
      deliveries.length > 0
        ? deliveries.reduce(
            (s, d: any) => s + (d.delivery_margin_percentage || 0),
            0,
          ) / deliveries.length
        : 0;

    const monthly: Record<
      string,
      { revenue: number; cost: number; profit: number; count: number }
    > = {};
    for (const d of deliveries) {
      const month = new Date(d.createdAt).toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });
      if (!monthly[month])
        monthly[month] = { revenue: 0, cost: 0, profit: 0, count: 0 };
      monthly[month].revenue += (d.estimated_profit || 0) + this._totalCost(d);
      monthly[month].cost += this._totalCost(d);
      monthly[month].profit += d.estimated_profit || 0;
      monthly[month].count++;
    }

    return {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        avgMargin: Math.round(avgMargin * 100) / 100,
        totalDeliveries: deliveries.length,
      },
      monthly: Object.entries(monthly).map(([month, data]) => ({
        month,
        ...data,
        revenue: Math.round(data.revenue * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        profit: Math.round(data.profit * 100) / 100,
      })),
    };
  }

  async getExecutiveStats(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [daily, delayed, drivers, vehicles, weekly, financial] =
      await Promise.all([
        this.getDailyDeliveries(new Date().toISOString(), organizationId),
        this.getDelayedDeliveries(organizationId),
        this.getDriverPerformance(organizationId),
        this.getVehicleUtilization(organizationId),
        this.getWeeklyStats(organizationId),
        this.getFinancialReport(organizationId),
      ]);

    const statusCounts = daily.reduce((acc: any, d: any) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});

    const completedDeliveries = daily.filter(
      (d: any) => d.status === "DELIVERED",
    ).length;
    const avgTime = await this._calcAvgDeliveryTime(organizationId, today);

    return {
      dailyCount: daily.length,
      delayedCount: delayed.length,
      activeDrivers: drivers.length,
      fleetUtilization:
        vehicles.length > 0
          ? Math.round(
              (vehicles.filter((v: any) => v.usageCount > 0).length /
                vehicles.length) *
                100,
            )
          : 0,
      completedToday: completedDeliveries,
      avgDeliveryTime: avgTime,
      financial: financial.summary,
      weekly,
      distribution: [
        {
          name: "Entregues",
          value: statusCounts["DELIVERED"] || 0,
          color: "#10b981",
        },
        {
          name: "Em Rota",
          value: statusCounts["IN_TRANSIT"] || 0,
          color: "#3b82f6",
        },
        {
          name: "Pendentes",
          value: statusCounts["PENDING"] || 0,
          color: "#f59e0b",
        },
        {
          name: "Carregando",
          value: statusCounts["LOADING"] || 0,
          color: "#8b5cf6",
        },
      ],
      topDrivers: drivers
        .sort((a: any, b: any) => b.completedDeliveries - a.completedDeliveries)
        .slice(0, 5),
    };
  }

  async generateExcel(organizationId: string) {
    const Xlsx = await import("xlsx");
    const [deliveries, drivers, vehicles] = await Promise.all([
      this.prisma.delivery.findMany({
        where: { organizationId, deletedAt: null },
        include: { customer: true, driver: { include: { user: true } } },
      }),
      this.getDriverPerformance(organizationId),
      this.getVehicleUtilization(organizationId),
    ]);

    const wb = Xlsx.utils.book_new();

    const delWs = Xlsx.utils.json_to_sheet(
      deliveries.map((d: any) => ({
        Número: d.deliveryNumber,
        Cliente: d.customer?.name || "",
        Endereço: d.deliveryAddress,
        Status: d.status,
        Material: d.materialType,
        Quantidade: d.quantity,
        Motorista: d.driver?.user?.name || "",
        "Valor Total": d.total_km || 0,
        "Custo Combustível": d.expected_fuel_cost || 0,
        "Lucro Est.": d.estimated_profit || 0,
        Data: d.createdAt?.toISOString().split("T")[0] || "",
      })),
    );
    Xlsx.utils.book_append_sheet(wb, delWs, "Entregas");

    const drvWs = Xlsx.utils.json_to_sheet(drivers);
    Xlsx.utils.book_append_sheet(wb, drvWs, "Motoristas");

    const vehWs = Xlsx.utils.json_to_sheet(vehicles);
    Xlsx.utils.book_append_sheet(wb, vehWs, "Veículos");

    return Xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  async generatePdf(organizationId: string) {
    const PDFDocument = require("pdfkit");
    const [exec, financial] = await Promise.all([
      this.getExecutiveStats(organizationId),
      this.getFinancialReport(organizationId),
    ]);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("Relatório Executivo", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(9)
        .fillColor("#666")
        .text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, {
          align: "center",
        });
      doc.moveDown(1.5);

      doc.fontSize(11).fillColor("#333").font("Helvetica-Bold");
      doc.text("Resumo Operacional");
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(10);
      doc.text(`Entregas Hoje: ${exec.dailyCount}`);
      doc.text(`Entregas Atrasadas: ${exec.delayedCount}`);
      doc.text(`Motoristas Ativos: ${exec.activeDrivers}`);
      doc.text(`Concluídas Hoje: ${exec.completedToday}`);
      doc.text(`Tempo Médio: ${exec.avgDeliveryTime}`);
      doc.text(`Utilização Frota: ${exec.fleetUtilization}%`);
      doc.moveDown(1);

      if (exec.financial) {
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#333");
        doc.text("Resumo Financeiro");
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(10);
        doc.text(
          `Receita Total: R$ ${Number(exec.financial.totalRevenue || 0).toLocaleString("pt-BR")}`,
        );
        doc.text(
          `Custo Total: R$ ${Number(exec.financial.totalCost || 0).toLocaleString("pt-BR")}`,
        );
        doc.text(
          `Lucro Total: R$ ${Number(exec.financial.totalProfit || 0).toLocaleString("pt-BR")}`,
        );
        doc.text(`Margem Média: ${exec.financial.avgMargin}%`);
        doc.moveDown(1);
      }

      doc.font("Helvetica-Bold").fontSize(11).fillColor("#333");
      doc.text("Top Motoristas");
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(10);
      for (const d of exec.topDrivers || []) {
        doc.text(`${d.name}: ${d.completedDeliveries} entregas concluídas`);
      }
      doc.moveDown(1);

      doc.font("Helvetica-Bold").fontSize(11).fillColor("#333");
      doc.text("Distribuição por Status (Hoje)");
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(10);
      for (const d of exec.distribution || []) {
        doc.text(`${d.name}: ${d.value}`);
      }

      doc.end();
    });
  }

  private _totalCost(d: any) {
    return (
      (d.expected_fuel_cost || 0) +
      (d.driver_cost || 0) +
      (d.assistant_cost || 0) +
      (d.maintenance_cost || 0) +
      (d.toll_cost || 0)
    );
  }

  private async _calcAvgDeliveryTime(organizationId: string, _today: Date) {
    const completed = await this.prisma.delivery.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: "DELIVERED",
        completedAt: { not: null },
        startedAt: { not: null },
      },
      select: { startedAt: true, completedAt: true },
      take: 100,
      orderBy: { completedAt: "desc" },
    });

    if (completed.length === 0) return "—";

    const totalMinutes = completed.reduce((sum: number, d: any) => {
      const diff = (d.completedAt.getTime() - d.startedAt.getTime()) / 60000;
      return sum + diff;
    }, 0);
    const avg = Math.round(totalMinutes / completed.length);
    return avg < 60 ? `${avg}m` : `${Math.floor(avg / 60)}h${avg % 60}m`;
  }
}
