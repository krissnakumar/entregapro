import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  Req,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ExcelImportService } from "./excel-import.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles, Role } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

@Controller("deliveries")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ExcelImportController {
  constructor(private readonly excelImportService: ExcelImportService) {}

  @Post("upload-excel")
  @Roles(Role.ADMIN)
  @RequirePermissions("CREATE_DELIVERY")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
        ];
        if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
          cb(null, true);
        } else {
          cb(new Error("Tipo de arquivo não suportado. Use .xlsx, .xls ou .csv"), false);
        }
      },
    }),
  )
  async uploadExcel(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error("Nenhum arquivo enviado.");
    }

    return this.excelImportService.importExcelFile(
      file.buffer,
      file.originalname,
      req.user.organizationId,
      req.user.userId,
    );
  }

  @Get("upload-history")
  @Roles(Role.ADMIN)
  @RequirePermissions("CREATE_DELIVERY")
  getUploadHistory(
    @Req() req: any,
    @Query("take", new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.excelImportService.getUploadHistory(
      req.user.organizationId,
      take,
      skip,
    );
  }
}
