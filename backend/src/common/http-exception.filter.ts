import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { captureBackendError } from './error-monitoring';
import { extractExceptionMessage, sanitizeForLogs } from './logging-sanitizer';
import { ApiErrorCode } from './api-error';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Catch()
export class HttpExceptionWithRequestIdFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionWithRequestIdFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const requestId = request.requestId ?? response.getHeader('X-Request-Id');
    const fallbackMessage =
      status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Internal server error'
        : exception instanceof Error
          ? exception.message
          : 'Request failed';
    const message = extractExceptionMessage(exceptionResponse, fallbackMessage);
    const validationErrors =
      isRecord(exceptionResponse) && Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message
        : undefined;

    if (status >= 400) {
      const logPayload = {
        event: 'http_exception',
        requestId: String(requestId ?? 'unknown'),
        route: request.originalUrl,
        statusCode: status,
        message,
        validationErrors,
        requestBody: sanitizeForLogs(request.body),
      };

      if (status >= 500) {
        const stack = exception instanceof Error ? exception.stack : undefined;
        this.logger.error(JSON.stringify(logPayload), stack);
        captureBackendError({
          event: 'backend_unhandled_error',
          requestId: String(requestId ?? 'unknown'),
          route: request.originalUrl,
          status,
          message,
          userId:
            request.user &&
            typeof request.user === 'object' &&
            'id' in request.user &&
            typeof request.user.id === 'string'
              ? request.user.id
              : undefined,
        });
      } else {
        this.logger.warn(JSON.stringify(logPayload));
      }
    }

    if (response.headersSent) {
      return;
    }

    const responseBody = typeof exceptionResponse === 'object' && exceptionResponse !== null
      ? (exceptionResponse as Record<string, unknown>)
      : {};

    const code = typeof responseBody.code === 'string'
      ? responseBody.code
      : status === HttpStatus.UNAUTHORIZED
        ? ApiErrorCode.UNAUTHORIZED
        : status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? 'INTERNAL_ERROR'
        : ApiErrorCode.FORBIDDEN;

    response.status(status).json({
      code,
      message,
      requestId,
    });
  }
}
