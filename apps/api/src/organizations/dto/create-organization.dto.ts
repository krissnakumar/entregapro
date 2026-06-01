import { IsString, IsEmail, IsOptional, IsUUID } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class CreateOrganizationWithUserDto {
  @IsString()
  orgName: string;

  @IsString()
  orgSlug: string;

  @IsString()
  userName: string;

  @IsEmail()
  userEmail: string;

  @IsString()
  userPassword: string;
}
