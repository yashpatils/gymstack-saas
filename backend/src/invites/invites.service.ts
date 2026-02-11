import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '../users/user.model';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { CreateInviteDto } from './dto/create-invite.dto';

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvite(requester: User, input: CreateInviteDto) {
    if (![UserRole.Admin, UserRole.Owner].includes(requester.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    const orgId = await this.resolveRequesterOrgId(requester);
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.invite.create({
      data: {
        orgId,
        email: input.email.toLowerCase(),
        role: input.role,
        tokenHash,
        expiresAt,
        createdBy: requester.id,
      },
    });

    const inviteLink = this.buildInviteLink(token);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INVITE_LINK] ${inviteLink}`);
    }

    return { inviteLink };
  }

  async acceptInvite(input: AcceptInviteDto) {
    const tokenHash = this.hashToken(input.token);
    const invite = await this.prisma.invite.findFirst({
      where: {
        tokenHash,
        acceptedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invite has expired');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = existingUser
      ? await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            orgId: invite.orgId,
            role: invite.role,
          },
          select: {
            id: true,
            email: true,
            role: true,
            orgId: true,
          },
        })
      : await this.prisma.user.create({
          data: {
            email: invite.email,
            password: passwordHash,
            role: invite.role,
            orgId: invite.orgId,
          },
          select: {
            id: true,
            email: true,
            role: true,
            orgId: true,
          },
        });

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return { user };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildInviteLink(token: string): string {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return `${frontendUrl.replace(/\/+$/, '')}/platform/team?inviteToken=${token}`;
  }

  private async resolveRequesterOrgId(requester: User): Promise<string> {
    if (requester.orgId) {
      return requester.orgId;
    }

    if (requester.role !== UserRole.Admin) {
      throw new BadRequestException('Requester must belong to an org');
    }

    await this.prisma.user.update({
      where: { id: requester.id },
      data: { orgId: requester.id, role: Role.OWNER },
    });

    return requester.id;
  }
}
