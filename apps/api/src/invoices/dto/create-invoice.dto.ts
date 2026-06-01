import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  deliveryId?: string;
}
