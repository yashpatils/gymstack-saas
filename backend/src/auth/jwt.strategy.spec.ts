import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy support mode hardening', () => {
  it('does not apply support headers without explicit supportMode claim', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'admin@example.com', emailVerifiedAt: null, qaBypass: false }) },
      organization: { findUnique: jest.fn().mockResolvedValue(null) },
      gym: { findUnique: jest.fn() },
    } as any;

    const auditService = { log: jest.fn() } as any;
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'PLATFORM_ADMIN_EMAILS') return 'admin@example.com';
        return undefined;
      }),
    } as unknown as ConfigService;

    const strategy = new JwtStrategy(configService, prisma, auditService);

    const result = await strategy.validate(
      { headers: { 'x-support-tenant-id': 'tenant_1' }, ip: '127.0.0.1', url: '/' },
      { sub: 'user_1', id: 'user_1', email: 'admin@example.com', supportMode: false },
    );

    expect(result.supportMode).toBeUndefined();
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'SUPPORT_IMPERSONATION_DENIED' }));
  });
});
