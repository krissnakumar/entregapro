import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { InvoiceStatus } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { InvoiceProcessingService } from "./invoice-processing.service";

@Injectable()
export class InvoicesService implements OnModuleInit {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly uploadDir = path.join(process.cwd(), "uploads");
  private readonly cleanupInterval = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private invoiceProcessingService: InvoiceProcessingService,
    @Optional() @InjectQueue("invoice-processing") private invoiceQueue?: Queue,
  ) {}

  onModuleInit() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async cleanupOldFiles(): Promise<void> {
    try {
      const cutoff = Date.now() - this.cleanupInterval;
      const files = await fs.promises.readdir(this.uploadDir);
      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stat = await fs.promises.stat(filePath);
        if (stat.mtimeMs < cutoff) {
          await fs.promises.unlink(filePath);
          this.logger.log(`Cleaned up old file: ${file}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to clean up old files: ${err.message}`);
    }
  }

  async processInvoice(
    file: Express.Multer.File,
    deliveryId: string | undefined,
    organizationId: string,
  ) {
    const fileType = file.mimetype;

    // 1. Save file locally
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // 2. Create initial record in ERROR status (to be updated by worker)
    const invoice = await this.prisma.invoice.create({
      data: {
        fileUrl: `uploads/${fileName}`,
        fileType: fileType,
        status: InvoiceStatus.PENDING,
        deliveryId: deliveryId,
        organizationId: organizationId,
      },
    });

    if (this.invoiceQueue) {
      await this.invoiceQueue.add(
        "process-extraction",
        {
          invoiceId: invoice.id,
          filePath,
          fileType,
          fileName,
        },
        {
          deduplication: { id: invoice.id },
          removeOnComplete: { age: 3600 * 24 },
          removeOnFail: { age: 3600 * 24 },
        },
      );
    } else {
      this.logger.warn(
        "Invoice queue is disabled. Processing invoice synchronously.",
      );
      await this.invoiceProcessingService.processInvoiceFile(
        invoice.id,
        filePath,
        fileType,
      );
    }

    return this.findOne(invoice.id, organizationId);
  }

  private extractDetails(text: string) {
    // Enhanced regex extraction with more robust patterns
    const invoiceNumberMatch = text.match(
      /(?:Invoice|Inv|Nº|Bill|No)[:.\s#]*([A-Z0-9-]+)/i,
    );

    // Improved date extraction (Handles DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
    const dateMatch = text.match(/(\d{1,4}[/-]\d{1,2}[/-]\d{1,4})/);

    // Improved amount extraction (Handles currency symbols and thousands separators)
    const totalAmountMatch =
      text.match(
        /(?:Total|Amount|Valuation|Sum|Balance|Due)[:.\s]*[^\d]*([\d,]+(?:\.\d{2})?)/i,
      ) || text.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/);

    // Material extraction (Expanded list)
    const materialMatch =
      text.match(
        /(Concrete|Sand|Gravel|Aggregate|Cement|Ready Mix|Steel|Iron|Rebar|Wood|Timber|Brick|Block|Stone)/i,
      ) || text.match(/(?:Material|Product|Description)[:.\s]*([^\n]+)/i);

    // Quantity extraction (Expanded list)
    const quantityMatch =
      text.match(
        /(\d+(?:\.\d+)?)\s*(?:m3|tons|t|kg|units|bags|liters|l|m|sqm)/i,
      ) || text.match(/(?:Quantity|Qty|Volume|Size)[:.\s]*([^\n]+)/i);

    // Address extraction
    const addressMatch = text.match(
      /(?:Delivery Address|To|Ship To|Site|Destination|Local)[:.\s]*([^\n]+(?:\n[^\n]+)?)/i,
    );

    // Customer name extraction
    const customerMatch = text.match(
      /(?:Bill To|Customer|Client|Recipient|Sold To)[:.\s]*([^\n]+)/i,
    );

    // Date validation
    let parsedDate = new Date();
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    return {
      invoiceNumber: invoiceNumberMatch
        ? invoiceNumberMatch[1]
        : `INV-${Date.now().toString().slice(-6)}`,
      vendorName: customerMatch
        ? customerMatch[1].trim().substring(0, 50)
        : "Standard Vendor",
      issueDate: parsedDate,
      totalAmount: totalAmountMatch
        ? parseFloat(totalAmountMatch[1].replace(/,/g, ""))
        : 0,
      materialType: materialMatch
        ? materialMatch[0].trim().substring(0, 50)
        : "Standard Load",
      quantity: quantityMatch
        ? quantityMatch[0].trim().substring(0, 20)
        : "10 m³",
      address: addressMatch
        ? addressMatch[1].trim().replace(/\n/g, ", ").substring(0, 100)
        : "Main Construction Site",
    };
  }

  async confirm(id: string, organizationId: string) {
    const res = await this.prisma.invoice.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { status: InvoiceStatus.PROCESSED },
    });
    if (res.count === 0) {
      throw new NotFoundException("Invoice not found");
    }
    return this.findOne(id, organizationId);
  }

  async findAll(organizationId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId, deletedAt: null },
      include: { items: true, delivery: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { items: true, delivery: true },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async importExcel(rows: any[], organizationId: string) {
    const validatedRows: any[] = [];
    const createdDeliveries: any[] = [];

    for (const row of rows) {
      const errors: string[] = [];

      // Validation System logic
      if (!row.invoiceNumber) errors.push("Missing Invoice Number");
      if (!row.customer) errors.push("Missing Customer Name");
      if (!row.destination) errors.push("Missing Destination Address");
      if (!row.quantity || isNaN(parseFloat(row.quantity)))
        errors.push("Invalid Material Quantity");
      if (
        row.truckType &&
        !["Dump Truck", "Flatbed", "Mixer", "Box Truck"].includes(row.truckType)
      ) {
        errors.push(`Unsupported truck requirement: ${row.truckType}`);
      }

      // Detect duplicate invoices
      if (row.invoiceNumber) {
        const existing = await this.prisma.invoice.findFirst({
          where: {
            invoiceNumber: row.invoiceNumber,
            organizationId,
            deletedAt: null,
          },
        });
        if (existing)
          errors.push(`Duplicate invoice detected: ${row.invoiceNumber}`);
      }

      if (errors.length > 0) {
        validatedRows.push({ row, status: "ERROR", errors });
      } else {
        let customerObj = await this.prisma.customer.findFirst({
          where: {
            name: { equals: row.customer, mode: "insensitive" },
            organizationId,
            deletedAt: null,
          },
        });
        if (!customerObj) {
          customerObj = await this.prisma.customer.create({
            data: {
              name: row.customer,
              phone: row.phone || "555-0199",
              address: row.destination,
              latitude: -23.5505,
              longitude: -46.6333,
              organizationId: organizationId,
            },
          });
        }

        const delivery = await this.prisma.delivery.create({
          data: {
            deliveryNumber: `DEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            customerId: customerObj.id,
            materialType: row.materialList || "General Cargo",
            quantity: String(row.quantity),
            deliveryAddress: row.destination,
            latitude: -23.5505,
            longitude: -46.6333,
            scheduledTime: row.deliveryDate
              ? new Date(row.deliveryDate)
              : new Date(),
            status: "PENDING",
            organizationId: organizationId,
          },
        });

        const weight = parseFloat(row.weight);
        const totalAmount = !isNaN(weight) ? weight * 10 : 1000;

        await this.prisma.invoice.create({
          data: {
            invoiceNumber: row.invoiceNumber,
            vendorName: row.customer,
            totalAmount,
            status: "PROCESSED",
            fileUrl: "excel-import",
            fileType: "xlsx",
            deliveryId: delivery.id,
            organizationId: organizationId,
          },
        });

        createdDeliveries.push(delivery);
        validatedRows.push({ row, status: "SUCCESS", errors: [] });
      }
    }

    return {
      totalProcessed: rows.length,
      successCount: createdDeliveries.length,
      errorCount: validatedRows.filter((r) => r.status === "ERROR").length,
      results: validatedRows,
    };
  }
}
