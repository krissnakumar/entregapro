import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";

export const TENANT_KEY = "tenant";
export const BypassTenant = () => SetMetadata(TENANT_KEY, true);

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const bypassTenant = this.reflector.getAllAndOverride<boolean>(TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (bypassTenant) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Let JwtAuthGuard handle auth rejection; TenantGuard only sets org context
    if (!user) return true;

    if (!user.organizationId) {
      throw new ForbiddenException("No organization associated with user");
    }

    request.organizationId = user.organizationId;

    return true;
  }
}

export function UseTenant() {
  return function (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) {
    if (descriptor) {
      Reflect.defineMetadata(TENANT_KEY, false, target, propertyKey!);
    } else {
      Reflect.defineMetadata(TENANT_KEY, false, target);
    }
  };
}
