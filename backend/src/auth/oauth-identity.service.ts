import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthIdentity, MembershipRole, MembershipStatus, OAuthProvider, Role, UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { OAuthProfile, OAuthRequestedMode } from './oauth.types';

@Injectable()
export class OAuthIdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async handleOAuthLoginOrLink(
    provider: OAuthProvider,
    profile: OAuthProfile,
    requestedMode: OAuthRequestedMode,
    currentUserId: string | null,
    options?: { allowUserCreation?: boolean },
  ): Promise<{ accessToken: string; linked: boolean; userId: string }> {
    const allowUserCreation = options?.allowUserCreation ?? true;
    const existingIdentity = await this.prisma.authIdentity.findUnique({
      where: { provider_providerSubject: { provider, providerSubject: profile.subject } },
    });

    if (existingIdentity) {
      if (requestedMode === 'link' && currentUserId && existingIdentity.userId !== currentUserId) {
        throw new ConflictException('OAuth identity is already linked to another user');
      }
      await this.updateIdentity(existingIdentity.id, profile);
      await this.enforceOwnerSocialPolicy(existingIdentity.userId);
      const token = await this.issueTokenForUser(existingIdentity.userId);
      return { accessToken: token, linked: false, userId: existingIdentity.userId };
    }

    if (requestedMode === 'link') {
      if (!currentUserId) {
        throw new UnauthorizedException('Link mode requires an authenticated user');
      }
      await this.attachIdentity(currentUserId, provider, profile);
      await this.enforceOwnerSocialPolicy(currentUserId);
      const token = await this.issueTokenForUser(currentUserId);
      return { accessToken: token, linked: true, userId: currentUserId };
    }

    if (profile.email && profile.emailVerified) {
      const normalizedEmail = profile.email.toLowerCase();
      const matchedUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { authIdentities: true },
      });

      if (matchedUser) {
        const hasTrustedIdentity = matchedUser.authIdentities.some((identity) => identity.emailVerified);
        if (!matchedUser.emailVerifiedAt && !hasTrustedIdentity) {
          throw new ConflictException(
            'ACCOUNT_LINK_REQUIRES_PASSWORD_LOGIN',
          );
        }

        await this.attachIdentity(matchedUser.id, provider, profile);
        await this.enforceOwnerSocialPolicy(matchedUser.id);
        const token = await this.issueTokenForUser(matchedUser.id);
        return { accessToken: token, linked: true, userId: matchedUser.id };
      }

      if (!allowUserCreation) {
        throw new UnauthorizedException('INVITE_REQUIRED');
      }

      const createdUser = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          password: '',
          role: Role.USER,
          emailVerifiedAt: new Date(),
          status: UserStatus.ACTIVE,
        },
      });
      await this.attachIdentity(createdUser.id, provider, profile);
      await this.enforceOwnerSocialPolicy(createdUser.id);
      const token = await this.issueTokenForUser(createdUser.id);
      return { accessToken: token, linked: true, userId: createdUser.id };
    }

    throw new BadRequestException('OAuth provider did not return a verified email for account creation.');
  }


  private async enforceOwnerSocialPolicy(userId: string): Promise<void> {
    const ownerMemberships = await this.prisma.membership.findMany({
      where: { userId, role: MembershipRole.TENANT_OWNER, status: MembershipStatus.ACTIVE },
      select: { orgId: true },
    });

    if (ownerMemberships.length === 0) {
      return;
    }

    const allowed = await this.prisma.ownerOperatorSetting.findFirst({
      where: {
        userId,
        tenantId: { in: ownerMemberships.map((membership) => membership.orgId) },
        allowOwnerStaffLogin: true,
      },
      select: { id: true },
    });

    if (!allowed) {
      throw new ConflictException('OWNERS_SOCIAL_LOGIN_DISABLED');
    }
  }

  private issueTokenForUser(userId: string): Promise<string> {
    return this.authService.issueAccessTokenForUser(userId);
  }

  private attachIdentity(userId: string, provider: OAuthProvider, profile: OAuthProfile): Promise<AuthIdentity> {
    return this.prisma.authIdentity.create({
      data: {
        userId,
        provider,
        providerSubject: profile.subject,
        email: profile.email,
        emailVerified: profile.emailVerified,
        displayName: profile.name,
        avatarUrl: profile.avatar,
      },
    });
  }

  private updateIdentity(id: string, profile: OAuthProfile): Promise<AuthIdentity> {
    return this.prisma.authIdentity.update({
      where: { id },
      data: {
        email: profile.email,
        emailVerified: profile.emailVerified,
        displayName: profile.name,
        avatarUrl: profile.avatar,
      },
    });
  }
}
