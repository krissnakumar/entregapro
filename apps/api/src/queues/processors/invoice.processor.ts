import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { InvoiceProcessingService } from "../../invoices/invoice-processing.service";

@Processor("invoice-processing")
export class InvoiceProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceProcessor.name);

  constructor(private invoiceProcessingService: InvoiceProcessingService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { invoiceId, filePath, fileType } = job.data;
    this.logger.log(`Processing invoice ${invoiceId} in background...`);
    return this.invoiceProcessingService.processInvoiceFile(
      invoiceId,
      filePath,
      fileType,
    );
  }
}
