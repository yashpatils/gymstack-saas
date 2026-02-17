import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(request, response, startedAt);
        },
        error: () => {
          this.logRequest(request, response, startedAt);
        },
      }),
    );
  }

  private logRequest(request: Request, response: Response, startedAt: number): void {
    const requestUser = isRecord(request.user) ? request.user : null;
    const authorization = request.header('authorization');
    if (authorization || requestUser) {
      response.setHeader('Cache-Control', 'no-store');
    }
    const activeTenantId = request.header('X-Active-Tenant-Id') ?? undefined;
    const activeLocationId = request.header('X-Active-Location-Id') ?? undefined;

    const payload = {
      event: 'http_request',
      requestId: request.requestId ?? String(response.getHeader('X-Request-Id') ?? 'unknown'),
      userId: typeof requestUser?.id === 'string' ? requestUser.id : undefined,
      tenantId:
        activeTenantId ??
        (typeof requestUser?.activeTenantId === 'string' ? requestUser.activeTenantId : undefined),
      locationId:
        activeLocationId ??
        (typeof requestUser?.activeGymId === 'string' ? requestUser.activeGymId : undefined),
      route: request.originalUrl,
      status: response.statusCode,
      durationMs: Date.now() - startedAt,
    };

    this.logger.log(JSON.stringify(payload));
  }
}
