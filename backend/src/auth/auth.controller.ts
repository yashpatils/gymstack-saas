import { Body, Controller, Get, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { MembershipRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { AuthMeResponseDto, MeDto, MembershipDto } from './dto/me.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthExceptionFilter } from './auth-exception.filter';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetContextDto } from './dto/set-context.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SetModeDto } from './dto/set-mode.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { SensitiveRateLimitService } from '../common/sensitive-rate-limit.service';
import { RegisterWithInviteDto } from './dto/register-with-invite.dto';

function getRequestContext(req: Request): { ip?: string; userAgent?: string } {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : req.ip;
  const userAgent = req.headers['user-agent'];

  return {
    ip,
    userAgent: typeof userAgent === 'string' ? userAgent : undefined,
  };
}

type RequestUser = MeDto & {
  activeTenantId?: string;
  activeGymId?: string;
  activeRole?: MembershipRole;
};

@UseFilters(AuthExceptionFilter)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sensitiveRateLimitService: SensitiveRateLimitService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('signup')
  signup(
    @Body() body: SignupDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole }; emailDeliveryWarning?: string }> {
    return this.authService.signup(body, getRequestContext(req));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(
    @Body() body: LoginDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole }; emailDeliveryWarning?: string }> {
    return this.authService.login(body, getRequestContext(req));
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('register-with-invite')
  registerWithInvite(@Body() body: RegisterWithInviteDto, @Req() req: Request) {
    return this.authService.registerWithInvite(body, getRequestContext(req));
  }


  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body() body: RefreshDto, @Req() req: Request): Promise<{ accessToken: string; refreshToken: string; me: AuthMeResponseDto }> {
    return this.authService.refresh(body.refreshToken, getRequestContext(req));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('resend-verification')
  resendVerification(@Body() body: ResendVerificationDto, @Req() req: Request): Promise<{ ok: true; message: string }> {
    const context = getRequestContext(req);
    const emailKey = body.email.trim().toLowerCase();
    const ipKey = context.ip ?? 'unknown';
    this.sensitiveRateLimitService.check(`resend:${ipKey}:${emailKey}`, 5, 60_000);

    return this.authService.resendVerification(body.email);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto): Promise<{ ok: true }> {
    return this.authService.verifyEmail(body.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-context')
  setContext(@Req() req: { user: RequestUser }, @Body() body: SetContextDto): Promise<{ accessToken: string }> {
    return this.authService.setContext(req.user.id, body.tenantId, body.gymId ?? body.locationId);
  }


  @UseGuards(JwtAuthGuard)
  @Post('set-mode')
  setMode(@Req() req: { user: RequestUser }, @Body() body: SetModeDto): Promise<AuthMeResponseDto> {
    return this.authService.setMode(req.user.id, body.tenantId, body.mode, body.locationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: RequestUser }): Promise<AuthMeResponseDto> {
    return this.authService.me(req.user.id, {
      tenantId: req.user.activeTenantId,
      gymId: req.user.activeGymId,
      role: req.user.activeRole,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('logout')
  logout(@Req() req: { user: RequestUser }, @Body() body: LogoutDto): Promise<{ ok: true }> {
    return this.authService.logout(req.user.id, body);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto): Promise<{ ok: true }> {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto): Promise<{ ok: true }> {
    return this.authService.resetPassword(body.token, body.newPassword);
  }
}
