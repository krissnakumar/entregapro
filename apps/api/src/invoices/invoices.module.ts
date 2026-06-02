import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { InvoicesService } from "./invoices.service";
import { InvoicesController } from "./invoices.controller";
import { NfeController } from "./nfe/nfe.controller";
import { NfeService } from "./nfe/nfe.service";
import { PrismaModule } from "../prisma/prisma.module";
import { InvoiceProcessor } from "../queues/processors/invoice.processor";

@Module({
  imports: [PrismaModule, MulterModule.register({ dest: "./uploads" })],
  controllers: [InvoicesController, NfeController],
  providers: [InvoicesService, NfeService, InvoiceProcessor],
  exports: [InvoicesService, NfeService],
})
export class InvoicesModule {}
