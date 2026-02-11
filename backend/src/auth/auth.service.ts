import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { MembershipRole, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MeDto } from './dto/me.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { normalizeRole } from './role.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async signup(input: SignupDto): Promise<{ accessToken: string; user: MeDto }> {
    const { email, password, role } = input;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          role: role ?? Role.USER,
          password: passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: `${email.split('@')[0]}'s Organization`,
        },
      });

      const membership = await tx.membership.create({
        data: {
          orgId: organization.id,
          userId: user.id,
          role: MembershipRole.OWNER,
        },
      });

      return { user, membership };
    });

    await this.notificationsService.createForUser({
      userId: created.user.id,
      type: 'signup.success',
      title: 'Welcome to GymStack',
      body: 'Your account was created successfully.',
    });

    if (!process.env.STRIPE_SECRET_KEY) {
      await this.notificationsService.createForUser({
        userId: created.user.id,
        type: 'billing.warning',
        title: 'Billing is not configured',
        body: 'Stripe is not configured yet. Billing flows will remain unavailable until setup is complete.',
      });
    }

    const payload = {
      sub: created.user.id,
      id: created.user.id,
      email: created.user.email,
      role: normalizeRole(created.user.role),
      orgId: created.membership.orgId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: created.user.id,
        email: created.user.email,
        role: normalizeRole(created.user.role),
        orgId: created.membership.orgId,
      },
    };
  }

  async login(input: LoginDto): Promise<{ accessToken: string; user: MeDto }> {
    const { email, password } = input;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId: user.id },
    });

    if (!membership) {
      throw new UnauthorizedException('User has no organization membership');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: normalizeRole(user.role),
      orgId: membership.orgId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: normalizeRole(user.role),
        orgId: membership.orgId,
      },
    };
  }

  async forgotPassword(email: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { ok: true };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[auth] Password reset link for ${email}: http://localhost:3000/reset-password?token=${token}`,
      );
    }

    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ ok: true }> {
    const tokenHash = this.hashResetToken(token);
    const now = new Date();

    const existingToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
    });

    if (!existingToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: existingToken.userId },
        data: { password: passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: existingToken.id },
        data: { usedAt: now },
      }),
    ]);

    return { ok: true };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
