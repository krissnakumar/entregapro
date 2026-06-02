import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  UploadedFiles,
  Body,
  Req,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

@Controller("invoices")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post("upload")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MANAGE_INVOICES")
  @UseInterceptors(FileInterceptor("file"))
  uploadInvoice(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() createInvoiceDto: CreateInvoiceDto,
  ) {
    return this.invoicesService.processInvoice(
      file,
      createInvoiceDto.deliveryId,
      req.user.organizationId,
    );
  }

  @Post("bulk-upload")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MANAGE_INVOICES")
  @UseInterceptors(FilesInterceptor("files"))
  async bulkUploadInvoices(
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() createInvoiceDto: CreateInvoiceDto,
  ) {
    const results: any[] = [];
    for (const file of files) {
      const result = await this.invoicesService.processInvoice(
        file,
        createInvoiceDto.deliveryId,
        req.user.organizationId,
      );
      results.push(result);
    }
    return results;
  }

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.ACCOUNTANT)
  @RequirePermissions("VIEW_INVOICES")
  findAll(@Req() req: any) {
    return this.invoicesService.findAll(req.user.organizationId);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.ACCOUNTANT)
  @RequirePermissions("VIEW_INVOICES")
  findOne(@Param("id") id: string, @Req() req: any) {
    return this.invoicesService.findOne(id, req.user.organizationId);
  }

  @Patch(":id/confirm")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MANAGE_INVOICES")
  confirm(@Param("id") id: string, @Req() req: any) {
    return this.invoicesService.confirm(id, req.user.organizationId);
  }

  @Post("excel-import")
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @RequirePermissions("MANAGE_INVOICES")
  importExcel(@Req() req: any, @Body("rows") rows: any[]) {
    return this.invoicesService.importExcel(
      rows || [],
      req.user.organizationId,
    );
  }
}
