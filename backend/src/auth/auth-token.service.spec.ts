import { BadRequestException } from '@nestjs/common';
import { AuthTokenPurpose } from '@prisma/client';
import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  it('throws a BadRequestException for invalid token lookups', async () => {
    const prisma = {
      authToken: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const service = new AuthTokenService(prisma);

    await expect(service.consumeToken({ token: 'invalid', purpose: AuthTokenPurpose.EMAIL_VERIFY })).rejects.toBeInstanceOf(BadRequestException);
  });
});
