import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { InvoicesService } from "./invoices.service";
import { InvoicesController } from "./invoices.controller";
import { NfeController } from "./nfe/nfe.controller";
import { NfeService } from "./nfe/nfe.service";
import { ExcelImportService } from "./excel-import.service";
import { ExcelImportController } from "./excel-import.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { InvoiceProcessingService } from "./invoice-processing.service";
import { InvoiceProcessor } from "../queues/processors/invoice.processor";

@Module({
  imports: [PrismaModule, MulterModule.register({ dest: "./uploads" }), NotificationsModule],
  controllers: [InvoicesController, NfeController, ExcelImportController],
  providers: [
    InvoicesService,
    NfeService,
    InvoiceProcessor,
    InvoiceProcessingService,
    ExcelImportService,
  ],
  exports: [InvoicesService, NfeService, InvoiceProcessingService, ExcelImportService],
})
export class InvoicesModule {}
