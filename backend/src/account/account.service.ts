import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditActorType, AuthTokenPurpose, MembershipRole, MembershipStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
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

  async updateDisplayName(userId: string, name: string): Promise<{ ok: true; name: string }> {
    const sanitized = name.trim();
    if (!sanitized) {
      throw new BadRequestException('Name is required');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { name: sanitized },
    });

    await this.auditService.log({
      actor: { userId, type: AuditActorType.USER },
      action: 'account.profile.name_updated',
      targetType: 'user',
      targetId: userId,
      metadata: { nameLength: sanitized.length },
    });

    return { ok: true, name: sanitized };
  }

  async requestEmailChangeOtp(userId: string, newEmailRaw: string): Promise<{ ok: true; expiresInSeconds: number; resendInSeconds: number }> {
    const newEmail = newEmailRaw.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid account');
    }

    if (newEmail === user.email.toLowerCase()) {
      throw new BadRequestException('New email must be different from current email');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    const now = new Date();
    const [pending] = await this.prisma.$queryRaw<Array<{ id: string; resendAvailableAt: Date }>>`
      SELECT "id", "resendAvailableAt"
      FROM "PendingEmailChange"
      WHERE "userId" = ${userId}
        AND "consumedAt" IS NULL
        AND "expiresAt" > ${now}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    if (pending && pending.resendAvailableAt.getTime() > now.getTime()) {
      const waitSeconds = Math.ceil((pending.resendAvailableAt.getTime() - now.getTime()) / 1000);
      throw new BadRequestException(`Please wait ${waitSeconds}s before requesting another code`);
    }

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp);
    const expiresInSeconds = this.getNumericEnv('EMAIL_CHANGE_OTP_TTL_SECONDS', 600);
    const resendInSeconds = this.getNumericEnv('EMAIL_CHANGE_OTP_RESEND_SECONDS', 45);
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);
    const resendAvailableAt = new Date(now.getTime() + resendInSeconds * 1000);

    await this.prisma.$executeRaw`
      INSERT INTO "PendingEmailChange" (
        "id", "userId", "newEmail", "otpHash", "expiresAt", "attempts", "requestCount", "resendAvailableAt", "createdAt", "updatedAt", "consumedAt"
      ) VALUES (
        ${`pec_${randomBytes(10).toString('hex')}`}, ${userId}, ${newEmail}, ${otpHash}, ${expiresAt}, 0, 1, ${resendAvailableAt}, ${now}, ${now}, NULL
      )
    `;

    await this.emailService.sendEmailChangeOtp({ to: newEmail, otp, expiresInSeconds });

    await this.auditService.log({
      actor: { userId, type: AuditActorType.USER },
      action: 'account.email_change.otp_requested',
      targetType: 'user',
      targetId: userId,
      metadata: { newEmail },
    });

    return { ok: true, expiresInSeconds, resendInSeconds };
  }

  async verifyEmailChangeOtp(userId: string, newEmailRaw: string, otp: string): Promise<{ ok: true }> {
    const newEmail = newEmailRaw.trim().toLowerCase();
    const now = new Date();
    const [pending] = await this.prisma.$queryRaw<Array<{ id: string; otpHash: string; expiresAt: Date; attempts: number; newEmail: string }>>`
      SELECT "id", "otpHash", "expiresAt", "attempts", "newEmail"
      FROM "PendingEmailChange"
      WHERE "userId" = ${userId}
        AND "newEmail" = ${newEmail}
        AND "consumedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    if (!pending) {
      throw new BadRequestException('No pending email change found for this address');
    }

    if (pending.expiresAt.getTime() <= now.getTime()) {
      throw new BadRequestException('OTP has expired');
    }

    const maxAttempts = this.getNumericEnv('EMAIL_CHANGE_OTP_MAX_ATTEMPTS', 5);
    if (pending.attempts >= maxAttempts) {
      throw new BadRequestException('Too many attempts. Request a new OTP');
    }

    if (this.hashOtp(otp) !== pending.otpHash) {
      await this.prisma.$executeRaw`
        UPDATE "PendingEmailChange"
        SET "attempts" = "attempts" + 1,
            "updatedAt" = ${now}
        WHERE "id" = ${pending.id}
      `;
      throw new BadRequestException('Invalid OTP');
    }

    const duplicateUser = await this.prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (duplicateUser) {
      throw new BadRequestException('Email is already in use');
    }

    const currentUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!currentUser) {
      throw new UnauthorizedException('Invalid account');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "PendingEmailChange"
        SET "consumedAt" = ${now},
            "updatedAt" = ${now}
        WHERE "id" = ${pending.id}
      `;

      await tx.user.update({
        where: { id: userId },
        data: {
          email: newEmail,
          emailVerifiedAt: now,
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });

      await tx.authToken.updateMany({
        where: {
          userId,
          consumedAt: null,
          purpose: { in: [AuthTokenPurpose.EMAIL_VERIFY, AuthTokenPurpose.PASSWORD_RESET] },
        },
        data: { consumedAt: now },
      });
    });

    await this.emailService.sendEmailChangedNotice({ to: currentUser.email, newEmail });
    await this.auditService.log({
      actor: { userId, type: AuditActorType.USER },
      action: 'account.email_change.completed',
      targetType: 'user',
      targetId: userId,
      metadata: { newEmail },
    });

    return { ok: true };
  }

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

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private generateOtp(): string {
    return String(randomInt(100000, 1000000));
  }

  private getNumericEnv(envName: string, fallback: number): number {
    const raw = process.env[envName];
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private getTtlMinutes(envName: string, fallback: number): number {
    return this.getNumericEnv(envName, fallback);
  }
}
