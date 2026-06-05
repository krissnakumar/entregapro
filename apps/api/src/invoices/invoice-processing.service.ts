import { Injectable, Logger } from "@nestjs/common";
import { InvoiceStatus } from "@prisma/client";
import * as fs from "fs";
import * as mammoth from "mammoth";
import { PrismaService } from "../prisma/prisma.service";
import * as xlsx from "xlsx";
import { createWorker } from "tesseract.js";

const pdf = require("pdf-parse");

let ocrWorker: Awaited<ReturnType<typeof createWorker>> | null = null;

async function getOcrWorker() {
  if (!ocrWorker) {
    ocrWorker = await createWorker("eng");
  }

  return ocrWorker;
}

@Injectable()
export class InvoiceProcessingService {
  private readonly logger = new Logger(InvoiceProcessingService.name);

  constructor(private prisma: PrismaService) {}

  async processInvoiceFile(
    invoiceId: string,
    filePath: string,
    fileType: string,
  ): Promise<{ success: boolean; deliveryId?: string; skipped?: boolean }> {
    this.logger.log(`Processing invoice ${invoiceId}...`);

    const existing = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true },
    });

    if (!existing) {
      this.logger.warn(`Invoice ${invoiceId} not found, skipping.`);
      return { success: false, skipped: true };
    }

    if (existing.status === InvoiceStatus.PROCESSED) {
      this.logger.log(`Invoice ${invoiceId} already processed, skipping.`);
      return { success: true, skipped: true };
    }

    try {
      if (existing.status === InvoiceStatus.ERROR) {
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: InvoiceStatus.PENDING },
        });
      }

      const buffer = fs.readFileSync(filePath);
      let extractedText = "";

      if (fileType === "application/pdf") {
        const data = await pdf(buffer);
        extractedText = data.text;
      } else if (
        fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } else if (
        fileType.includes("spreadsheet") ||
        fileType.includes("excel")
      ) {
        const workbook = xlsx.read(buffer, { type: "buffer" });
        workbook.SheetNames.forEach((name) => {
          extractedText +=
            xlsx.utils.sheet_to_txt(workbook.Sheets[name]) + "\n";
        });
      } else if (fileType.startsWith("image/")) {
        const worker = await getOcrWorker();
        const ret = await worker.recognize(buffer);
        extractedText = ret.data.text;
      }

      const details = this.extractDetails(extractedText);
      const invoiceRecord = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { organizationId: true },
      });
      const orgId = invoiceRecord?.organizationId || "unknown";

      let customer = await this.prisma.customer.findFirst({
        where: { name: { equals: details.vendorName, mode: "insensitive" } },
      });

      if (!customer) {
        customer = await this.prisma.customer.create({
          data: {
            name: details.vendorName,
            address: details.address,
            phone: "N/A",
            latitude: -23.5505,
            longitude: -46.6333,
            organizationId: orgId,
          },
        });
      }

      const delivery = await this.prisma.delivery.create({
        data: {
          deliveryNumber: `DLV-${Math.floor(1000 + Math.random() * 9000)}`,
          customerId: customer.id,
          materialType: details.materialType,
          quantity: details.quantity,
          deliveryAddress: details.address,
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          latitude: customer.latitude,
          longitude: customer.longitude,
          organizationId: orgId,
        },
      });

      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          invoiceNumber: details.invoiceNumber,
          vendorName: details.vendorName,
          issueDate: details.issueDate,
          totalAmount: details.totalAmount,
          extractedText,
          status: InvoiceStatus.PROCESSED,
          deliveryId: delivery.id,
        },
      });

      return { success: true, deliveryId: delivery.id };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Failed to process invoice ${invoiceId}: ${message}`);
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.ERROR },
      });
      throw error;
    }
  }

  private extractDetails(text: string) {
    const invoiceNumberMatch = text.match(
      /(?:Invoice|Inv|Nº|Bill|No)[:.\s#]*([A-Z0-9-]+)/i,
    );
    const dateMatch = text.match(/(\d{1,4}[/-]\d{1,2}[/-]\d{1,4})/);
    const totalAmountMatch = text.match(
      /(?:Total|Amount|Valuation|Sum|Balance|Due)[:.\s]*[^\d]*([\d,]+(?:\.\d{2})?)/i,
    );
    const materialMatch = text.match(
      /(Concrete|Sand|Gravel|Aggregate|Cement|Steel|Iron|Brick|Block|Stone)/i,
    );
    const quantityMatch = text.match(
      /(\d+(?:\.\d+)?)\s*(?:m3|tons|t|kg|units|bags|liters|l|m|sqm)/i,
    );
    const addressMatch = text.match(
      /(?:Delivery Address|To|Ship To|Site|Destination|Local)[:.\s]*([^\n]+)/i,
    );
    const customerMatch = text.match(
      /(?:Bill To|Customer|Client|Recipient|Sold To)[:.\s]*([^\n]+)/i,
    );

    let parsedDate = new Date();
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!Number.isNaN(d.getTime())) {
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
        ? Number.parseFloat(totalAmountMatch[1].replace(/,/g, ""))
        : 0,
      materialType: materialMatch
        ? materialMatch[0].trim().substring(0, 50)
        : "Standard Load",
      quantity: quantityMatch
        ? quantityMatch[0].trim().substring(0, 20)
        : "10 m3",
      address: addressMatch
        ? addressMatch[1].trim().substring(0, 100)
        : "Main Construction Site",
    };
  }
}
