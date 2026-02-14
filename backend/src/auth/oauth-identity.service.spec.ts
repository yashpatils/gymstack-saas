import { ConflictException } from '@nestjs/common';
import { OAuthProvider } from '@prisma/client';
import { OAuthIdentityService } from './oauth-identity.service';

describe('OAuthIdentityService', () => {
  it('requires password login before auto-link when local email is unverified', async () => {
    const prisma = {
      authIdentity: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1', emailVerifiedAt: null, authIdentities: [] }),
      },
    } as never;

    const authService = {} as never;
    const service = new OAuthIdentityService(prisma, authService);

    await expect(service.handleOAuthLoginOrLink(OAuthProvider.google, {
      subject: 'sub-1',
      email: 'test@example.com',
      emailVerified: true,
      name: 'Test',
      avatar: null,
    }, 'login', null)).rejects.toBeInstanceOf(ConflictException);
  });
});
