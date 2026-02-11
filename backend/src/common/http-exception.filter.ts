import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

    if (status >= 500) {
      const message = exception instanceof Error ? exception.message : String(exception);
      this.logger.error(
        `Request failed with status ${status} [requestId=${requestId ?? 'unknown'}]: ${message}`,
      );
    }

    if (response.headersSent) {
      return;
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      response.status(status).json({
        ...(exceptionResponse as Record<string, unknown>),
        statusCode: status,
        requestId,
      });
      return;
    }

    const fallbackMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    response.status(status).json({
      message: fallbackMessage,
      statusCode: status,
      requestId,
    });
  }
}
