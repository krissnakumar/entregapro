import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { PrismaService } from "./prisma.service";

@Injectable()
export class ActivityLoggerInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body } = request;

    return next.handle().pipe(
      tap(async () => {
        if (method !== "GET" && user) {
          try {
            await this.prisma.activityLog.create({
              data: {
                userId: user.userId,
                action: method,
                entity: url.split("/")[1] || "unknown",
                details: body || {},
                ipAddress: request.ip,
                userAgent: request.headers["user-agent"],
                organizationId: user.organizationId || request.organizationId,
              },
            });
          } catch (e) {
            // Silently fail logging to prevent blocking the request
            console.error("Failed to log activity:", e);
          }
        }
      }),
    );
  }
}
