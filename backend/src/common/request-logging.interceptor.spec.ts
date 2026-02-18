import { CallHandler, ExecutionContext } from '@nestjs/common';
import { EventEmitter } from 'events';
import { of } from 'rxjs';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

type MockRequest = {
  requestId?: string;
  user?: unknown;
  originalUrl: string;
  header: (name: string) => string | undefined;
};

type MockResponse = EventEmitter & {
  headersSent: boolean;
  writableEnded: boolean;
  statusCode: number;
  setHeader: jest.Mock;
  getHeader: jest.Mock;
};

const createExecutionContext = (request: MockRequest, response: MockResponse): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ExecutionContext);

describe('RequestLoggingInterceptor', () => {
  it('sets headers before request handling and logs final response status on finish', () => {
    const interceptor = new RequestLoggingInterceptor();
    const loggerLogSpy = jest.spyOn((interceptor as any).logger, 'log').mockImplementation();

    const request: MockRequest = {
      requestId: 'req-123',
      user: { id: 'user-1' },
      originalUrl: '/api/auth/me',
      header: (name) => (name.toLowerCase() === 'authorization' ? 'Bearer token' : undefined),
    };

    const response = new EventEmitter() as MockResponse;
    response.headersSent = false;
    response.writableEnded = false;
    response.statusCode = 200;
    response.setHeader = jest.fn();
    response.getHeader = jest.fn();

    const context = createExecutionContext(request, response);
    const callHandler: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(context, callHandler).subscribe();

    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'req-123');
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');

    response.headersSent = true;
    response.statusCode = 401;
    response.writableEnded = true;
    response.emit('finish');

    const payload = JSON.parse(String(loggerLogSpy.mock.calls[0][0]));
    expect(payload.requestId).toBe('req-123');
    expect(payload.status).toBe(401);
    expect(payload.route).toBe('/api/auth/me');
  });

  it('does not mutate headers after response is already sent', () => {
    const interceptor = new RequestLoggingInterceptor();
    const loggerLogSpy = jest.spyOn((interceptor as any).logger, 'log').mockImplementation();

    const request: MockRequest = {
      requestId: 'req-sent',
      originalUrl: '/api/auth/refresh',
      header: () => undefined,
    };

    const response = new EventEmitter() as MockResponse;
    response.headersSent = true;
    response.writableEnded = false;
    response.statusCode = 200;
    response.setHeader = jest.fn();
    response.getHeader = jest.fn().mockReturnValue('req-sent');

    const context = createExecutionContext(request, response);
    const callHandler: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(context, callHandler).subscribe();

    expect(response.setHeader).not.toHaveBeenCalled();

    response.writableEnded = true;
    response.statusCode = 204;
    response.emit('finish');

    const payload = JSON.parse(String(loggerLogSpy.mock.calls[0][0]));
    expect(payload.requestId).toBe('req-sent');
    expect(payload.status).toBe(204);
  });
});
