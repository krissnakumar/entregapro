import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
} from "class-validator";

export class CreateJobSiteDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsNumber() latitude: number;
  @IsNumber() longitude: number;
  @IsOptional() polygon?: any;
  @IsOptional() @IsNumber() radius?: number;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() status?: string;
}

export class UpdateJobSiteDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() polygon?: any;
  @IsOptional() @IsNumber() radius?: number;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() status?: string;
}
