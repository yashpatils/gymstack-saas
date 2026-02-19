import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, finalize } from 'rxjs';
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
    const existingRequestId = response.locals?.requestId ?? response.getHeader('x-request-id') ?? response.getHeader('X-Request-Id');
    const requestId = request.requestId ?? String(existingRequestId ?? 'unknown');

    if (response.locals) {
      response.locals.requestId = requestId;
    }

    this.safeSetHeader(response, 'x-request-id', requestId);

    const requestUser = isRecord(request.user) ? request.user : null;
    const authorization = request.header('authorization');
    if (authorization || requestUser) {
      this.safeSetHeader(response, 'Cache-Control', 'no-store');
    }

    let hasLogged = false;

    const logIfNeeded = (): void => {
      if (hasLogged) {
        return;
      }
      hasLogged = true;
      this.logRequest(request, response, startedAt, requestId);
    };

    response.once('finish', logIfNeeded);
    response.once('close', () => {
      if (!response.writableEnded) {
        logIfNeeded();
      }
    });

    return next.handle().pipe(
      finalize(() => {
        if (response.writableEnded || response.headersSent) {
          logIfNeeded();
        }
      }),
    );
  }

  private safeSetHeader(response: Response, key: string, value: string): void {
    if (response.headersSent || response.writableEnded) {
      return;
    }

    response.setHeader(key, value);
  }

  private logRequest(request: Request, response: Response, startedAt: number, requestId: string): void {
    const requestUser = isRecord(request.user) ? request.user : null;
    const activeTenantId = request.header('X-Active-Tenant-Id') ?? undefined;
    const activeLocationId = request.header('X-Active-Location-Id') ?? undefined;

    const payload = {
      event: 'http_request',
      requestId,
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
