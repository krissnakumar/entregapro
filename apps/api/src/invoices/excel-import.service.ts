import {
  Injectable,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import * as XLSX from "xlsx";

export interface ExcelRow {
  invoice_number?: string;
  customer_name?: string;
  customer_phone?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  product_name?: string;
  quantity?: number;
  weight?: number;
  volume?: number;
  invoice_value?: number;
  delivery_date?: string;
  priority?: number;
  notes?: string;
  [key: string]: any;
}

export interface UploadSummary {
  totalRows: number;
  createdDeliveries: number;
  skippedDuplicates: number;
  failedRows: number;
  validationErrors: Array<{ row: number; errors: string[] }>;
  createdDeliveryIds: string[];
}

@Injectable()
export class ExcelImportService {
  private readonly logger = new Logger(ExcelImportService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async importExcelFile(
    fileBuffer: Buffer,
    fileName: string,
    organizationId: string,
    createdByAdminId: string,
  ): Promise<UploadSummary> {
    // 1. Parse Excel file
    let rows: ExcelRow[];
    try {
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new BadRequestException("Planilha vazia ou inválida.");
      }
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      // 2. Map column names to expected fields (support Portuguese and English)
      rows = rawData.map((row) => this.mapColumns(row));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Erro ao ler planilha: ${error.message}`);
    }

    if (rows.length === 0) {
      throw new BadRequestException("Planilha não contém dados.");
    }

    // 3. Validate and process rows
    const summary: UploadSummary = {
      totalRows: rows.length,
      createdDeliveries: 0,
      skippedDuplicates: 0,
      failedRows: 0,
      validationErrors: [],
      createdDeliveryIds: [],
    };

    // Group rows by invoice_number
    const groupedByInvoice = new Map<string, ExcelRow[]>();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel rows start at 2 (1 is header)

      // Validate required fields
      const errors = this.validateRow(row);
      if (errors.length > 0) {
        summary.validationErrors.push({ row: rowNum, errors });
        summary.failedRows++;
        continue;
      }

      const invoiceKey = row.invoice_number || `UNKNOWN-${Date.now()}`;
      if (!groupedByInvoice.has(invoiceKey)) {
        groupedByInvoice.set(invoiceKey, []);
      }
      groupedByInvoice.get(invoiceKey)!.push({ ...row, _rowNum: rowNum });
    }

    // 4. Process each invoice group
    for (const [invoiceNumber, invoiceRows] of groupedByInvoice) {
      try {
        // Check for duplicate invoice
        const existingInvoice = await this.prisma.invoice.findFirst({
          where: {
            invoiceNumber,
            organizationId,
            deletedAt: null,
          },
        });

        if (existingInvoice) {
          summary.skippedDuplicates++;
          continue;
        }

        // Get the first row for customer/address info (all rows in group share same invoice)
        const firstRow = invoiceRows[0];

        // Find or create customer
        let customer = await this.prisma.customer.findFirst({
          where: {
            name: { equals: firstRow.customer_name || "Cliente", mode: "insensitive" },
            organizationId,
            deletedAt: null,
          },
        });

        if (!customer) {
          customer = await this.prisma.customer.create({
            data: {
              name: firstRow.customer_name || "Cliente",
              phone: firstRow.customer_phone || "00000000000",
              address: firstRow.address || "Endereço não informado",
              latitude: firstRow.latitude || -23.5505,
              longitude: firstRow.longitude || -46.6333,
              organizationId,
            },
          });
        }

        // Create delivery
        const deliveryNumber = `DEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const delivery = await this.prisma.delivery.create({
          data: {
            deliveryNumber,
            customerId: customer.id,
            materialType: firstRow.product_name || "Geral",
            quantity: String(firstRow.quantity || 1),
            deliveryAddress: firstRow.address || customer.address,
            latitude: firstRow.latitude || customer.latitude,
            longitude: firstRow.longitude || customer.longitude,
            scheduledTime: firstRow.delivery_date
              ? new Date(firstRow.delivery_date)
              : new Date(),
            status: "PENDING",
            deliveryStatus: "CREATED",
            organizationId,
            createdByAdminId,
          },
        });

        // Create delivery items for each row in the invoice group
        for (const row of invoiceRows) {
          await this.prisma.deliveryItem.create({
            data: {
              deliveryId: delivery.id,
              productName: row.product_name || "Item",
              quantity: row.quantity || 1,
              weight: row.weight || null,
              volume: row.volume || null,
              notes: row.notes || null,
              organizationId,
            },
          });
        }

        // Create invoice
        const totalWeight = invoiceRows.reduce((sum, r) => sum + (r.weight || 0), 0);
        const totalVolume = invoiceRows.reduce((sum, r) => sum + (r.volume || 0), 0);
        const totalValue = invoiceRows.reduce((sum, r) => sum + (r.invoice_value || 0), 0);

        await this.prisma.invoice.create({
          data: {
            invoiceNumber,
            vendorName: firstRow.customer_name || "Cliente",
            totalAmount: totalValue || null,
            status: "PROCESSED",
            fileUrl: `excel-import/${fileName}`,
            fileType: "xlsx",
            weight: totalWeight || null,
            volume: totalVolume || null,
            priority: firstRow.priority || 0,
            deliveryNotes: firstRow.notes || null,
            deliveryDeadline: firstRow.delivery_date
              ? new Date(firstRow.delivery_date)
              : null,
            deliveryId: delivery.id,
            organizationId,
            createdBy: createdByAdminId,
          },
        });

        // Create timeline entry
        await this.prisma.deliveryTimeline.create({
          data: {
            deliveryId: delivery.id,
            organizationId,
            actorId: createdByAdminId,
            actorRole: "ADMIN",
            eventType: "STATUS_CHANGE",
            oldStatus: null,
            newStatus: "CREATED",
            note: `Entrega criada via upload Excel (fatura: ${invoiceNumber})`,
          },
        });

        summary.createdDeliveries++;
        summary.createdDeliveryIds.push(delivery.id);
      } catch (error) {
        this.logger.error(`Failed to process invoice ${invoiceNumber}: ${error.message}`);
        summary.failedRows++;
        summary.validationErrors.push({
          row: invoiceRows[0]?._rowNum || 0,
          errors: [`Erro ao processar fatura ${invoiceNumber}: ${error.message}`],
        });
      }
    }

    // 5. Notify dispatchers about new deliveries
    if (summary.createdDeliveries > 0) {
      await this.notificationsService.alertDispatchersAndAdmins(
        "Upload Excel Concluído",
        `${summary.createdDeliveries} entrega(s) criada(s) via upload Excel. ${summary.skippedDuplicates} duplicata(s) ignorada(s). ${summary.failedRows} falha(s).`,
        organizationId,
      );
    }

    return summary;
  }

  private mapColumns(row: Record<string, any>): ExcelRow {
    // Support both Portuguese and English column names
    const columnMap: Record<string, string> = {
      // English
      invoice_number: "invoice_number",
      customer_name: "customer_name",
      customer_phone: "customer_phone",
      address: "address",
      city: "city",
      neighborhood: "neighborhood",
      latitude: "latitude",
      longitude: "longitude",
      product_name: "product_name",
      quantity: "quantity",
      weight: "weight",
      volume: "volume",
      invoice_value: "invoice_value",
      delivery_date: "delivery_date",
      priority: "priority",
      notes: "notes",
      // Portuguese
      numero_fatura: "invoice_number",
      nf: "invoice_number",
      nota_fiscal: "invoice_number",
      nome_cliente: "customer_name",
      cliente: "customer_name",
      telefone: "customer_phone",
      celular: "customer_phone",
      whatsapp: "customer_phone",
      endereco: "address",
      rua: "address",
      bairro: "neighborhood",
      cidade: "city",
      municipio: "city",
      lat: "latitude",
      lng: "longitude",
      produto: "product_name",
      material: "product_name",
      descricao: "product_name",
      quantidade: "quantity",
      qtd: "quantity",
      peso: "weight",
      valor: "invoice_value",
      valor_total: "invoice_value",
      data_entrega: "delivery_date",
      prazo: "delivery_date",
      prioridade: "priority",
      observacoes: "notes",
      obs: "notes",
    };

    const mapped: ExcelRow = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
      const mappedKey = columnMap[normalizedKey] || normalizedKey;
      if (mappedKey in mapped || columnMap[mappedKey]) {
        (mapped as any)[mappedKey] = value;
      }
    }

    // Parse numeric fields
    if (mapped.latitude) mapped.latitude = parseFloat(String(mapped.latitude));
    if (mapped.longitude) mapped.longitude = parseFloat(String(mapped.longitude));
    if (mapped.quantity) mapped.quantity = parseFloat(String(mapped.quantity));
    if (mapped.weight) mapped.weight = parseFloat(String(mapped.weight));
    if (mapped.volume) mapped.volume = parseFloat(String(mapped.volume));
    if (mapped.invoice_value) mapped.invoice_value = parseFloat(String(mapped.invoice_value));
    if (mapped.priority) mapped.priority = parseInt(String(mapped.priority));

    return mapped;
  }

  private validateRow(row: ExcelRow): string[] {
    const errors: string[] = [];
    if (!row.invoice_number) errors.push("Número da fatura é obrigatório");
    if (!row.customer_name) errors.push("Nome do cliente é obrigatório");
    if (!row.address) errors.push("Endereço é obrigatório");
    if (row.quantity !== undefined && (isNaN(row.quantity) || row.quantity <= 0)) {
      errors.push("Quantidade deve ser um número positivo");
    }
    if (row.weight !== undefined && isNaN(row.weight)) {
      errors.push("Peso deve ser um número");
    }
    if (row.volume !== undefined && isNaN(row.volume)) {
      errors.push("Volume deve ser um número");
    }
    return errors;
  }

  async getUploadHistory(organizationId: string, take = 50, skip = 0) {
    // Get recent deliveries created via Excel import
    const [data, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where: {
          organizationId,
          deletedAt: null,
          createdBy: { not: null },
        },
        take,
        skip,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          deliveryNumber: true,
          materialType: true,
          deliveryAddress: true,
          status: true,
          deliveryStatus: true,
          createdAt: true,
          customer: { select: { name: true } },
          invoices: {
            select: { invoiceNumber: true, fileUrl: true },
            where: { fileUrl: { contains: "excel-import" } },
          },
        },
      }),
      this.prisma.delivery.count({
        where: {
          organizationId,
          deletedAt: null,
          createdBy: { not: null },
        },
      }),
    ]);

    return { data, total, take, skip };
  }
}
