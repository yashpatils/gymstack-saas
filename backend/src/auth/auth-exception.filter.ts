import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { extractExceptionMessage, sanitizeForLogs } from '../common/logging-sanitizer';

@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    if (!request.originalUrl.includes('/auth')) {
      throw exception;
    }

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const message = extractExceptionMessage(exceptionResponse, 'Request failed');

    this.logger.warn(
      JSON.stringify({
        event: 'auth_http_exception',
        requestId: request.requestId ?? 'unknown',
        route: request.originalUrl,
        statusCode,
        message,
        validationErrors:
          typeof exceptionResponse === 'object' &&
          exceptionResponse !== null &&
          'message' in exceptionResponse &&
          Array.isArray((exceptionResponse as { message?: unknown }).message)
            ? (exceptionResponse as { message: unknown[] }).message
            : undefined,
        requestBody: sanitizeForLogs(request.body),
      }),
    );

    response.status(statusCode).json({
      message,
      statusCode,
      requestId: request.requestId,
    });
  }
}
