import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SubscriptionService } from "../subscription.service";

export const CHECK_LIMIT_KEY = "checkLimit";
export const CheckLimit = (metric: string) => Reflector.createDecorator<string>()(metric);

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metric = this.reflector.getAllAndOverride<string>(CHECK_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metric) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.organizationId) return true;

    const result = await this.subscriptionService.checkUsageLimit(user.organizationId, metric);
    if (!result.allowed) {
      throw new ForbiddenException(
        `Limite de ${metric} atingido (${result.current}/${result.limit}). Faça upgrade do seu plano.`,
      );
    }
    return true;
  }
}
