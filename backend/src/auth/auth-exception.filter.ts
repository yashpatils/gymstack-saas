import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    if (!request.originalUrl.includes('/auth')) {
      throw exception;
    }

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = 'Request failed';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const rawMessage = (exceptionResponse as { message: string | string[] }).message;
      message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
    }

    response.status(statusCode).json({
      message,
      statusCode,
      requestId: request.requestId,
    });
  }
}
