import { Controller, Get, Post, Query, Req, Res, UnauthorizedException, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MembershipRole, OAuthProvider } from '@prisma/client';
import type { Request, Response } from 'express';
import { OAuthStateService } from './oauth-state.service';
import { OAuthIdentityService } from './oauth-identity.service';
import { sanitizeReturnTo } from './sanitize-return-to';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from '../invites/invites.service';
import { AuthService } from './auth.service';
import { OAuthProfile, OAuthRequestedMode } from './oauth.types';
import { InviteAdmissionService } from '../invites/invite-admission.service';

type RequestUser = { id: string };

@Controller('auth/oauth')
export class OauthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly stateService: OAuthStateService,
    private readonly identityService: OAuthIdentityService,
    private readonly prisma: PrismaService,
    private readonly invitesService: InvitesService,
    private readonly authService: AuthService,
    private readonly inviteAdmissionService: InviteAdmissionService,
  ) {}

  @Get('google/start')
  async googleStart(
    @Query('returnTo') returnToInput: string | undefined,
    @Query('mode') modeInput: OAuthRequestedMode | undefined,
    @Query('inviteToken') inviteToken: string | undefined,
    @Query('siteSlug') siteSlug: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const mode: OAuthRequestedMode = modeInput === 'link' ? 'link' : 'login';
    const appUrl = this.configService.get<string>('APP_URL') ?? 'https://gymstack.club';
    const allowedHosts = this.configService.get<string>('OAUTH_ALLOWED_RETURN_HOSTS') ?? 'gymstack.club,*.gymstack.club';
    const returnTo = await sanitizeReturnTo(returnToInput, appUrl, allowedHosts, this.prisma);
    const stateSecret = this.oauthStateSecret();
    const state = this.stateService.sign({ returnTo, requestedMode: mode, timestamp: Date.now(), nonce: this.stateService.newNonce(), inviteToken, siteSlug }, stateSecret);

    const params = new URLSearchParams({
      client_id: this.required('GOOGLE_CLIENT_ID'),
      redirect_uri: this.required('GOOGLE_REDIRECT_URI'),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'consent',
      access_type: 'offline',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') state: string, @Req() req: Request & { user?: RequestUser }, @Res() res: Response): Promise<void> {
    const parsedState = this.stateService.verify(state, this.oauthStateSecret(), 10 * 60_000);
    if (parsedState.inviteToken) {
      const invite = await this.invitesService.validateInvite(parsedState.inviteToken);
      if (!invite.ok) {
        res.redirect(this.withOAuthError(parsedState.returnTo, this.inviteReasonToError(invite.reason)));
        return;
      }
      const inviteRoleSupported =
        invite.role === MembershipRole.GYM_STAFF_COACH ||
        invite.role === MembershipRole.CLIENT ||
        invite.role === MembershipRole.TENANT_LOCATION_ADMIN;
      if (!inviteRoleSupported) {
        res.redirect(this.withOAuthError(parsedState.returnTo, 'invite_invalid'));
        return;
      }
    }

    const tokenData = await this.exchangeGoogleCode(code);
    const profile = await this.validateGoogleIdToken(tokenData.id_token);
    if (!profile.emailVerified || !profile.email) {
      res.redirect(this.withOAuthError(parsedState.returnTo, 'email_not_verified'));
      return;
    }
    if (parsedState.inviteToken) {
      const invite = await this.invitesService.getUsableInvite(parsedState.inviteToken, profile.email);
      if (!invite) {
        res.redirect(this.withOAuthError(parsedState.returnTo, 'invite_role_mismatch'));
        return;
      }
    }
    let result: { accessToken: string; linked: boolean; userId: string };
    try {
      result = await this.identityService.handleOAuthLoginOrLink(
        OAuthProvider.google,
        profile,
        parsedState.requestedMode,
        req.user?.id ?? null,
        { allowUserCreation: Boolean(parsedState.inviteToken) },
      );
    } catch {
      res.redirect(this.withOAuthError(parsedState.returnTo, 'invite_required'));
      return;
    }
    let accessToken = result.accessToken;
    if (parsedState.inviteToken) {
      await this.inviteAdmissionService.admitWithInvite({
        token: parsedState.inviteToken,
        userId: result.userId,
        emailFromProviderOrSignup: profile.email,
      });
      accessToken = await this.authService.issueAccessTokenForUser(result.userId);
    } else {
      const memberships = await this.prisma.membership.count({ where: { userId: result.userId, status: 'ACTIVE' } });
      if (memberships === 0) {
        res.redirect(this.withOAuthError(parsedState.returnTo, 'invite_required'));
        return;
      }
    }
    const redirectUrl = new URL(parsedState.returnTo);
    redirectUrl.searchParams.set('oauth', 'success');
    redirectUrl.searchParams.set('token', accessToken);
    if (parsedState.inviteToken) {
      redirectUrl.searchParams.set('inviteToken', parsedState.inviteToken);
    }
    if (parsedState.siteSlug) {
      redirectUrl.searchParams.set('siteSlug', parsedState.siteSlug);
    }
    res.redirect(redirectUrl.toString());
  }

  @Get('apple/start')
  async appleStart(
    @Query('returnTo') returnToInput: string | undefined,
    @Query('mode') modeInput: OAuthRequestedMode | undefined,
    @Query('inviteToken') inviteToken: string | undefined,
    @Query('siteSlug') siteSlug: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const mode: OAuthRequestedMode = modeInput === 'link' ? 'link' : 'login';
    const appUrl = this.configService.get<string>('APP_URL') ?? 'https://gymstack.club';
    const allowedHosts = this.configService.get<string>('OAUTH_ALLOWED_RETURN_HOSTS') ?? 'gymstack.club,*.gymstack.club';
    const returnTo = await sanitizeReturnTo(returnToInput, appUrl, allowedHosts, this.prisma);
    const state = this.stateService.sign({ returnTo, requestedMode: mode, timestamp: Date.now(), nonce: this.stateService.newNonce(), inviteToken, siteSlug }, this.oauthStateSecret());

    const params = new URLSearchParams({
      client_id: this.required('APPLE_CLIENT_ID'),
      redirect_uri: this.required('APPLE_REDIRECT_URI'),
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email',
      state,
    });

    res.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
  }

  @Post('apple/callback')
  async appleCallback(@Body('id_token') idToken: string, @Body('state') state: string, @Req() req: Request & { user?: RequestUser }, @Res() res: Response): Promise<void> {
    const parsedState = this.stateService.verify(state, this.oauthStateSecret(), 10 * 60_000);
    if (parsedState.inviteToken) {
      const invite = await this.invitesService.validateInvite(parsedState.inviteToken);
      if (!invite.ok) {
        res.redirect(this.withOAuthError(parsedState.returnTo, this.inviteReasonToError(invite.reason)));
        return;
      }
      const inviteRoleSupported =
        invite.role === MembershipRole.GYM_STAFF_COACH ||
        invite.role === MembershipRole.CLIENT ||
        invite.role === MembershipRole.TENANT_LOCATION_ADMIN;
      if (!inviteRoleSupported) {
        res.redirect(this.withOAuthError(parsedState.returnTo, 'invite_invalid'));
        return;
      }
    }

    const profile = this.decodeJwtPayload(idToken);
    if (!profile.subject || !profile.email || !profile.emailVerified) {
      res.redirect(this.withOAuthError(parsedState.returnTo, 'email_not_verified'));
      return;
    }
    if (parsedState.inviteToken) {
      const invite = await this.invitesService.getUsableInvite(parsedState.inviteToken, profile.email);
      if (!invite) {
        res.redirect(this.withOAuthError(parsedState.returnTo, 'invite_role_mismatch'));
        return;
      }
    }

    let result: { accessToken: string; linked: boolean; userId: string };
    try {
      result = await this.identityService.handleOAuthLoginOrLink(
        OAuthProvider.apple,
        profile,
        parsedState.requestedMode,
        req.user?.id ?? null,
        { allowUserCreation: Boolean(parsedState.inviteToken) },
      );
    } catch {
      res.redirect(this.withOAuthError(parsedState.returnTo, 'invite_required'));
      return;
    }
    let accessToken = result.accessToken;
    if (parsedState.inviteToken) {
      await this.inviteAdmissionService.admitWithInvite({
        token: parsedState.inviteToken,
        userId: result.userId,
        emailFromProviderOrSignup: profile.email,
      });
      accessToken = await this.authService.issueAccessTokenForUser(result.userId);
    } else {
      const memberships = await this.prisma.membership.count({ where: { userId: result.userId, status: 'ACTIVE' } });
      if (memberships === 0) {
        res.redirect(this.withOAuthError(parsedState.returnTo, 'invite_required'));
        return;
      }
    }
    const redirectUrl = new URL(parsedState.returnTo);
    redirectUrl.searchParams.set('oauth', 'success');
    redirectUrl.searchParams.set('token', accessToken);
    if (parsedState.inviteToken) {
      redirectUrl.searchParams.set('inviteToken', parsedState.inviteToken);
    }
    if (parsedState.siteSlug) {
      redirectUrl.searchParams.set('siteSlug', parsedState.siteSlug);
    }
    res.redirect(redirectUrl.toString());
  }

  private async exchangeGoogleCode(code: string): Promise<{ id_token: string }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.required('GOOGLE_CLIENT_ID'),
        client_secret: this.required('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.required('GOOGLE_REDIRECT_URI'),
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Google token exchange failed');
    }

    return response.json() as Promise<{ id_token: string }>;
  }

  private async validateGoogleIdToken(idToken: string): Promise<OAuthProfile> {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google identity token');
    }

    const payload = await response.json() as { sub: string; email?: string; email_verified?: string; name?: string; picture?: string; aud?: string };
    if (payload.aud !== this.required('GOOGLE_CLIENT_ID')) {
      throw new UnauthorizedException('Google audience mismatch');
    }

    return {
      subject: payload.sub,
      email: payload.email?.toLowerCase() ?? null,
      emailVerified: payload.email_verified === 'true',
      name: payload.name ?? null,
      avatar: payload.picture ?? null,
    };
  }

  private decodeJwtPayload(idToken: string): OAuthProfile {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid JWT token');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      sub?: string;
      email?: string;
      email_verified?: boolean | string;
      name?: string;
      picture?: string;
    };

    return {
      subject: payload.sub ?? '',
      email: payload.email?.toLowerCase() ?? null,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: payload.name ?? null,
      avatar: payload.picture ?? null,
    };
  }

  private oauthStateSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? 'dev-secret';
  }

  private required(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new UnauthorizedException(`${key} is not configured`);
    }
    return value;
  }

  private withOAuthError(returnTo: string, error: string): string {
    const redirectUrl = new URL(returnTo);
    redirectUrl.searchParams.set('error', error);
    return redirectUrl.toString();
  }

  private inviteReasonToError(reason: 'INVALID' | 'EXPIRED' | 'ALREADY_USED' | 'REVOKED'): string {
    if (reason === 'ALREADY_USED') {
      return 'invite_already_used';
    }

    if (reason === 'REVOKED') {
      return 'invite_revoked';
    }

    if (reason === 'EXPIRED') {
      return 'invite_expired';
    }

    return 'invite_invalid';
  }
}
