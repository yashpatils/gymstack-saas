import { Injectable } from '@nestjs/common';
import { AuthTokenPurpose } from '@prisma/client';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issueToken(params: { userId: string; purpose: AuthTokenPurpose; ttlMinutes: number }): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const now = new Date();
    const expiresAt = new Date(Date.now() + params.ttlMinutes * 60_000);

    await this.prisma.$transaction(async (tx) => {
      await tx.authToken.deleteMany({
        where: {
          userId: params.userId,
          purpose: params.purpose,
          consumedAt: null,
          expiresAt: { gt: now },
        },
      });

      await tx.authToken.create({
        data: {
          userId: params.userId,
          purpose: params.purpose,
          tokenHash,
          expiresAt,
        },
      });
    });

    return token;
  }

  async consumeToken(params: { token: string; purpose: AuthTokenPurpose }): Promise<{ userId: string }> {
    const now = new Date();
    const hashedInput = this.hashToken(params.token);

    const storedToken = await this.prisma.authToken.findFirst({
      where: {
        tokenHash: hashedInput,
        purpose: params.purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true, userId: true, tokenHash: true },
    });

    if (!storedToken || !this.hashesMatch(storedToken.tokenHash, hashedInput)) {
      throw new Error('INVALID_TOKEN');
    }

    const consumed = await this.prisma.authToken.updateMany({
      where: {
        id: storedToken.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) {
      throw new Error('INVALID_TOKEN');
    }

    return { userId: storedToken.userId };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashesMatch(leftHash: string, rightHash: string): boolean {
    const left = Buffer.from(leftHash);
    const right = Buffer.from(rightHash);

    if (left.length !== right.length) {
      return false;
    }

    return timingSafeEqual(left, right);
  }
}
