import { SetMetadata } from "@nestjs/common";

export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  ACCOUNTANT = "ACCOUNTANT",
  DISPATCHER = "DISPATCHER",
  DRIVER = "DRIVER",
  HELPER = "HELPER",
}

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
