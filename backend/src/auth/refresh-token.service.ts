import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(userId: string, context?: { userAgent?: string; ipAddress?: string }): Promise<string> {
    const token = this.generateToken();
    const tokenHash = this.hash(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
      },
    });

    return token;
  }

  async rotate(token: string, context?: { userAgent?: string; ipAddress?: string }): Promise<{ userId: string; refreshToken: string }> {
    const tokenHash = this.hash(token);
    const now = new Date();

    const current = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!current || !this.hashesMatch(current.tokenHash, tokenHash) || current.revokedAt || current.expiresAt <= now) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const nextToken = this.generateToken();
    const nextTokenHash = this.hash(nextToken);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { tokenHash },
        data: { revokedAt: now, replacedByTokenHash: nextTokenHash },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: current.userId,
          tokenHash: nextTokenHash,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userAgent: context?.userAgent,
          ipAddress: context?.ipAddress,
        },
      }),
    ]);

    return { userId: current.userId, refreshToken: nextToken };
  }

  async revoke(token: string): Promise<void> {
    const tokenHash = this.hash(token);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateToken(): string {
    return randomBytes(48).toString('hex');
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

