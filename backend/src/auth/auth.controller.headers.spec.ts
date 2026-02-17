import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { AuthController } from './auth.controller';

function buildRequest(headers: Record<string, string> = {}): Request {
  return {
    ip: '127.0.0.1',
    headers,
    header: (name: string) => headers[name.toLowerCase()] ?? headers[name],
  } as unknown as Request;
}

describe('AuthController header requirements', () => {
  const authService = {
    signup: jest.fn().mockResolvedValue({}),
    adminLogin: jest.fn().mockResolvedValue({}),
    registerWithInvite: jest.fn().mockResolvedValue({}),
  };

  const sensitiveRateLimitService = {
    check: jest.fn(),
  };

  const controller = new AuthController(authService as never, sensitiveRateLimitService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows admin login without X-Requested-With header', async () => {
    await expect(controller.adminLogin({ email: 'admin@example.com', password: 'secret' }, buildRequest())).resolves.toEqual({});
    expect(authService.adminLogin).toHaveBeenCalled();
  });

  it('allows signup without X-Requested-With header', async () => {
    await expect(controller.signup({ email: 'new@example.com', password: 'secret' }, buildRequest())).resolves.toEqual({});
    expect(authService.signup).toHaveBeenCalled();
  });

  it('keeps required header validation for protected auth endpoints', async () => {
    await expect(controller.registerWithInvite({} as never, buildRequest())).rejects.toBeInstanceOf(BadRequestException);

    try {
      await controller.registerWithInvite({} as never, buildRequest());
    } catch (error) {
      const response = (error as BadRequestException).getResponse() as { code: string; message: string; missingHeaders: string[] };
      expect(response).toEqual({
        code: 'INVALID_HEADERS',
        message: 'Missing or invalid required headers.',
        missingHeaders: ['X-Requested-With'],
      });
    }
  });
});
