import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditActorType, AuthTokenPurpose, MembershipRole, MembershipStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuthTokenService } from '../auth/auth-token.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly authTokenService: AuthTokenService,
    private readonly auditService: AuditService,
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
    await this.auditService.log({
      actor: { userId, type: AuditActorType.USER },
      action: 'account.deletion.requested_email_confirmation',
      targetType: 'user',
      targetId: userId,
    });

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

    const graceDays = this.getTtlMinutes('ACCOUNT_DELETION_GRACE_DAYS', 7 * 24 * 60) / (24 * 60);
    const now = new Date();
    const deletedAt = new Date(now.getTime() + graceDays * 24 * 60 * 60_000);

    await this.prisma.$transaction(async (tx) => {
      await tx.membership.updateMany({
        where: { userId: consumedToken.userId, status: MembershipStatus.ACTIVE },
        data: { status: MembershipStatus.DISABLED },
      });

      await tx.user.update({
        where: { id: consumedToken.userId },
        data: {
          deletionRequestedAt: now,
          deletedAt,
        },
      });

      await tx.refreshToken.updateMany({ where: { userId: consumedToken.userId, revokedAt: null }, data: { revokedAt: now } });
    });

    await this.auditService.log({
      actor: { userId: consumedToken.userId, type: AuditActorType.USER },
      action: 'account.deletion.confirmed',
      targetType: 'user',
      targetId: consumedToken.userId,
      metadata: { graceDays },
    });

    return { ok: true };
  }

  async cancelDeletion(userId: string): Promise<{ ok: true }> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          deletionRequestedAt: null,
          deletedAt: null,
        },
      });

      await tx.membership.updateMany({
        where: { userId, status: MembershipStatus.DISABLED },
        data: { status: MembershipStatus.ACTIVE },
      });
    });

    await this.auditService.log({
      actor: { userId, type: AuditActorType.USER },
      action: 'account.deletion.canceled',
      targetType: 'user',
      targetId: userId,
    });

    return { ok: true };
  }

  async getDeletionStatus(userId: string): Promise<{ pendingDeletion: boolean; deletionRequestedAt: string | null; deletedAt: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deletionRequestedAt: true, deletedAt: true },
    });

    return {
      pendingDeletion: Boolean(user?.deletionRequestedAt),
      deletionRequestedAt: user?.deletionRequestedAt ? user.deletionRequestedAt.toISOString() : null,
      deletedAt: user?.deletedAt ? user.deletedAt.toISOString() : null,
    };
  }

  async runDeletionFinalizer(limit = 100): Promise<{ processed: number }> {
    const users = await this.prisma.user.findMany({
      where: {
        deletionRequestedAt: { not: null },
        deletedAt: { lte: new Date() },
        status: UserStatus.ACTIVE,
      },
      take: limit,
      select: { id: true, email: true },
    });

    for (const user of users) {
      const replacementEmail = `deleted+${user.id}@example.invalid`;
      const tombstonePassword = randomBytes(48).toString('hex');
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.DELETED,
          email: replacementEmail,
          password: tombstonePassword,
          emailVerifiedAt: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          orgId: null,
          deletionRequestedAt: null,
        },
      });
    }

    return { processed: users.length };
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

    for (const membership of ownerMemberships) {
      const ownerCount = await this.prisma.membership.count({
        where: { orgId: membership.orgId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Transfer ownership or add another owner before deleting your account.');
      }
    }
  }

  private getTtlMinutes(envName: string, fallback: number): number {
    const raw = process.env[envName];
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
