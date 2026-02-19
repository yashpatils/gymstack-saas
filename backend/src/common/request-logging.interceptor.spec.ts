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


  it('handles auth me -> refresh -> auth me traffic without header mutation after send', () => {
    const interceptor = new RequestLoggingInterceptor();
    const loggerLogSpy = jest.spyOn((interceptor as any).logger, 'log').mockImplementation();

    const makeResponse = (): MockResponse => {
      const response = new EventEmitter() as MockResponse;
      response.headersSent = false;
      response.writableEnded = false;
      response.statusCode = 200;
      response.setHeader = jest.fn();
      response.getHeader = jest.fn();
      return response;
    };

    const firstRequest: MockRequest = {
      requestId: 'me-1',
      originalUrl: '/api/auth/me',
      header: () => undefined,
    };
    const firstResponse = makeResponse();
    interceptor.intercept(createExecutionContext(firstRequest, firstResponse), { handle: () => of({ ok: false }) }).subscribe();
    firstResponse.headersSent = true;
    firstResponse.writableEnded = true;
    firstResponse.statusCode = 401;
    firstResponse.emit('finish');

    const refreshRequest: MockRequest = {
      requestId: 'refresh-1',
      originalUrl: '/api/auth/refresh',
      header: () => undefined,
    };
    const refreshResponse = makeResponse();
    interceptor.intercept(createExecutionContext(refreshRequest, refreshResponse), { handle: () => of({ ok: true }) }).subscribe();
    refreshResponse.headersSent = true;
    refreshResponse.writableEnded = true;
    refreshResponse.statusCode = 200;
    refreshResponse.emit('finish');

    const secondRequest: MockRequest = {
      requestId: 'me-2',
      originalUrl: '/api/auth/me',
      header: () => undefined,
    };
    const secondResponse = makeResponse();
    interceptor.intercept(createExecutionContext(secondRequest, secondResponse), { handle: () => of({ ok: true }) }).subscribe();
    secondResponse.headersSent = true;
    secondResponse.writableEnded = true;
    secondResponse.statusCode = 200;
    secondResponse.emit('finish');

    expect(firstResponse.setHeader).toHaveBeenCalledWith('x-request-id', 'me-1');
    expect(refreshResponse.setHeader).toHaveBeenCalledWith('x-request-id', 'refresh-1');
    expect(secondResponse.setHeader).toHaveBeenCalledWith('x-request-id', 'me-2');
    expect(loggerLogSpy).toHaveBeenCalledTimes(3);
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
