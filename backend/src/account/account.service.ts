import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthTokenPurpose, MembershipRole, MembershipStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuthTokenService } from '../auth/auth-token.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async requestDelete(userId: string, password: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true, status: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid account');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new ForbiddenException('Invalid credentials');
    }

    await this.ensureUserIsNotSoleOwner(userId);

    const token = await this.authTokenService.issueToken({
      userId,
      purpose: AuthTokenPurpose.ACCOUNT_DELETE,
      ttlMinutes: this.getTtlMinutes('DELETE_ACCOUNT_TOKEN_TTL_MINUTES', 30),
    });

    await this.emailService.sendDeleteAccountEmail({ to: user.email, token });

    return { ok: true };
  }

  async confirmDelete(token: string): Promise<{ ok: true }> {
    let consumedToken: { userId: string };
    try {
      consumedToken = await this.authTokenService.consumeToken({
        token,
        purpose: AuthTokenPurpose.ACCOUNT_DELETE,
      });
    } catch {
      throw new BadRequestException('Invalid or expired delete token');
    }

    await this.ensureUserIsNotSoleOwner(consumedToken.userId);

    const user = await this.prisma.user.findUnique({
      where: { id: consumedToken.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return { ok: true };
    }

    const replacementEmail = `deleted+${user.id}@example.invalid`;
    const tombstonePassword = randomBytes(48).toString('hex');

    await this.prisma.$transaction(async (tx) => {
      await tx.membership.updateMany({
        where: { userId: user.id, status: MembershipStatus.ACTIVE },
        data: { status: MembershipStatus.DISABLED },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.DELETED,
          email: replacementEmail,
          password: tombstonePassword,
          emailVerifiedAt: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          orgId: null,
        },
      });
      await tx.authToken.deleteMany({ where: { userId: user.id, consumedAt: null } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    });

    return { ok: true };
  }

  private async ensureUserIsNotSoleOwner(userId: string): Promise<void> {
    const ownerMemberships = await this.prisma.membership.findMany({
      where: {
        userId,
        role: MembershipRole.TENANT_OWNER,
        status: MembershipStatus.ACTIVE,
      },
      select: { orgId: true },
    });

    if (ownerMemberships.length === 0) {
      return;
    }

    const orgIds = ownerMemberships.map((membership) => membership.orgId);

    for (const orgId of orgIds) {
      const ownerCount = await this.prisma.membership.count({
        where: {
          orgId,
          role: MembershipRole.TENANT_OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Transfer ownership or add another owner before deleting your account.');
      }
    }
  }

  private getTtlMinutes(envName: string, fallback: number): number {
    const raw = process.env[envName];
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }

    return fallback;
  }
}
