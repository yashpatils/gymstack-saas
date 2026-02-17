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
    const rawMessage = extractExceptionMessage(exceptionResponse, 'Request failed');
    const responseReasonCode =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'code' in exceptionResponse &&
      typeof (exceptionResponse as { code?: unknown }).code === 'string'
        ? (exceptionResponse as { code: string }).code
        : undefined;

    const isValidationError =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as { message?: unknown }).message);

    const message = isValidationError ? 'Invalid request data.' : rawMessage;
    const reasonCode = responseReasonCode ?? (isValidationError ? 'AUTH_VALIDATION_FAILED' : 'AUTH_UNKNOWN');

    this.logger.warn(
      JSON.stringify({
        event: 'auth_http_exception',
        requestId: request.requestId ?? 'unknown',
        route: request.originalUrl,
        statusCode,
        safeMessage: message,
        reasonCode,
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
