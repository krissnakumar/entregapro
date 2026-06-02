import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { XMLParser } from "fast-xml-parser";
import { PrismaService } from "../../prisma/prisma.service";
import { join } from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";

interface NfeParsedData {
  accessKey: string;
  nfeNumber: string;
  series: number;
  issueDate: Date;
  vendorName: string;
  vendorDocument: string;
  customerName: string;
  customerDocument: string;
  totalAmount: number;
  totalTaxes: number;
  cfop: string;
  naturezaOperacao: string;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  iss: number;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    ncm: string;
    cst: string;
    cfop: string;
    icmsAliquota: number;
    icmsValor: number;
    ipiAliquota: number;
    ipiValor: number;
    pisAliquota: number;
    pisValor: number;
    cofinsAliquota: number;
    cofinsValor: number;
  }[];
}

@Injectable()
export class NfeService {
  private readonly logger = new Logger(NfeService.name);
  private readonly parser: XMLParser;

  constructor(private prisma: PrismaService) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
    });
  }

  async importXml(
    file: Express.Multer.File,
    organizationId: string,
    createdBy: string,
    deliveryId?: string,
  ) {
    const xmlContent = file.buffer.toString("utf-8");
    const data = this.parseNfeXml(xmlContent);

    const existing = await this.prisma.invoice.findUnique({
      where: { accessKey: data.accessKey },
    });
    if (existing) {
      throw new BadRequestException(
        `NF-e com chave ${data.accessKey} já importada`,
      );
    }

    const uploadsDir = join(process.cwd(), "uploads", "nfe");
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    const filename = `nfe_${data.accessKey}.xml`;
    const filePath = join(uploadsDir, filename);
    writeFileSync(filePath, xmlContent);

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber: data.nfeNumber,
        vendorName: data.vendorName,
        issueDate: data.issueDate,
        totalAmount: data.totalAmount,
        currency: "BRL",
        status: "AUTHORIZED",
        fileUrl: `/uploads/nfe/${filename}`,
        fileType: "text/xml",
        accessKey: data.accessKey,
        nfeNumber: data.nfeNumber,
        series: data.series,
        cfop: data.cfop,
        naturezaOperacao: data.naturezaOperacao,
        icms: data.icms,
        ipi: data.ipi,
        pis: data.pis,
        cofins: data.cofins,
        iss: data.iss,
        totalTaxes: data.totalTaxes,
        xmlContent,
        nfeStatus: "AUTHORIZED",
        organizationId,
        createdBy,
        deliveryId: deliveryId || null,
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            ncm: item.ncm,
            cst: item.cst,
            cfop: item.cfop,
            icmsAliquota: item.icmsAliquota,
            icmsValor: item.icmsValor,
            ipiAliquota: item.ipiAliquota,
            ipiValor: item.ipiValor,
            pisAliquota: item.pisAliquota,
            pisValor: item.pisValor,
            cofinsAliquota: item.cofinsAliquota,
            cofinsValor: item.cofinsValor,
          })),
        },
      },
      include: { items: true },
    });

    this.logger.log(`NF-e ${data.accessKey} imported successfully`);
    return invoice;
  }

  parseNfeXml(xml: string): NfeParsedData {
    try {
      const parsed = this.parser.parse(xml);
      const nfe = parsed.nfeProc?.NFe || parsed.NFe;
      if (!nfe) throw new Error("XML não contém estrutura NF-e válida");

      const ide = nfe.infNFe?.ide;
      const emit = nfe.infNFe?.emit;
      const dest = nfe.infNFe?.dest;
      const total = nfe.infNFe?.total?.ICMSTot;
      const dets = nfe.infNFe?.det;
      const items = Array.isArray(dets) ? dets : dets ? [dets] : [];

      const accessKey = nfe.infNFe?.["@_Id"]?.replace("NFe", "") || "";
      const icms = parseFloat(total?.vICMS || "0");
      const ipi = parseFloat(total?.vIPI || "0");
      const pis = parseFloat(total?.vPIS || "0");
      const cofins = parseFloat(total?.vCOFINS || "0");
      const iss = parseFloat(total?.vISS || "0");

      return {
        accessKey,
        nfeNumber: String(ide?.nNF || ""),
        series: parseInt(ide?.serie || "0", 10),
        issueDate: new Date(ide?.dhEmi || ide?.dEmi || new Date()),
        vendorName: emit?.xNome || "",
        vendorDocument: emit?.CNPJ || emit?.CPF || "",
        customerName: dest?.xNome || "",
        customerDocument: dest?.CNPJ || dest?.CPF || "",
        totalAmount: parseFloat(total?.vNF || "0"),
        totalTaxes: icms + ipi + pis + cofins + iss,
        cfop: items[0]?.prod?.CFOP || "",
        naturezaOperacao: ide?.natOp || "",
        icms,
        ipi,
        pis,
        cofins,
        iss,
        items: items.map((det: any) => {
          const prod = det.prod || {};
          const imposto = det.imposto || {};
          return {
            description: prod.xProd || "",
            quantity: parseFloat(prod.qCom || "0"),
            unitPrice: parseFloat(prod.vUnCom || "0"),
            totalPrice: parseFloat(prod.vProd || "0"),
            ncm: prod.NCM || "",
            cst:
              imposto?.ICMS?.ICMS00?.CST ||
              imposto?.ICMS?.ICMS20?.CST ||
              imposto?.ICMS?.ICMS60?.CST ||
              "",
            cfop: prod.CFOP || "",
            icmsAliquota: parseFloat(imposto?.ICMS?.ICMS00?.pICMS || "0"),
            icmsValor: parseFloat(imposto?.ICMS?.ICMS00?.vICMS || "0"),
            ipiAliquota: parseFloat(imposto?.IPI?.pIPI || "0"),
            ipiValor: parseFloat(imposto?.IPI?.vIPI || "0"),
            pisAliquota: parseFloat(imposto?.PIS?.PISAliq?.pPIS || "0"),
            pisValor: parseFloat(imposto?.PIS?.PISAliq?.vPIS || "0"),
            cofinsAliquota: parseFloat(
              imposto?.COFINS?.COFINSAliq?.pCOFINS || "0",
            ),
            cofinsValor: parseFloat(
              imposto?.COFINS?.COFINSAliq?.vCOFINS || "0",
            ),
          };
        }),
      };
    } catch (err: any) {
      this.logger.error(`Failed to parse NF-e XML: ${err.message}`);
      throw new BadRequestException(
        `Erro ao interpretar XML NF-e: ${err.message}`,
      );
    }
  }

  async cancelNfe(invoiceId: string, organizationId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId, deletedAt: null },
    });
    if (!invoice) throw new BadRequestException("NF-e não encontrada");
    if (invoice.nfeStatus !== "AUTHORIZED") {
      throw new BadRequestException(
        "Apenas NF-e autorizadas podem ser canceladas",
      );
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        nfeStatus: "CANCELLED",
        status: "CANCELLED",
        cancellationDate: new Date(),
      },
    });
  }
}
