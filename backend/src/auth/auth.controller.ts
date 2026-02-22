import { BadRequestException, Body, Controller, Get, HttpCode, HttpException, Logger, Post, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { createHash } from 'crypto';
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
import { ResendLoginOtpDto, ResendLoginOtpResponseDto, VerifyLoginOtpDto } from './dto/login-otp.dto';
import { LoginResponseUnion, LoginSuccessResponseDto } from './dto/login-response.dto';

function getRequestContext(req: Request): { ip?: string; userAgent?: string } {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : req.ip;
  const userAgent = req.headers['user-agent'];

  return {
    ip,
    userAgent: typeof userAgent === 'string' ? userAgent : undefined,
  };
}


function hashIdentifier(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function requireRequestedWithHeader(req: Request): void {
  const requestedWith = req.header('X-Requested-With');
  if (requestedWith !== 'XMLHttpRequest') {
    const missingHeaders = requestedWith ? [] : ['X-Requested-With'];
    throw new BadRequestException({
      code: 'INVALID_HEADERS',
      message: 'Missing or invalid required headers.',
      missingHeaders,
    });
  }
}

type RequestUser = MeDto & {
  activeTenantId?: string;
  activeGymId?: string;
  activeRole?: MembershipRole;
};

type AuthenticatedRequest = Request & { user: RequestUser };

@UseFilters(AuthExceptionFilter)
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sensitiveRateLimitService: SensitiveRateLimitService,
  ) {}

  private logAuthFailure(endpoint: string, req: Request, error: unknown): void {
    const statusCode = error instanceof HttpException ? error.getStatus() : 500;
    const message = error instanceof Error ? error.message : String(error);
    const responseDetails = error instanceof HttpException ? error.getResponse() : undefined;

    this.logger.error(
      JSON.stringify({
        event: 'auth_endpoint_failure',
        endpoint,
        requestId: req.requestId ?? 'unknown',
        statusCode,
        message,
        details: responseDetails,
      }),
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('signup')
  async signup(
    @Body() body: SignupDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole }; emailDeliveryWarning?: string }> {
    const context = getRequestContext(req);
    const ipKey = context.ip ?? 'unknown';
    const emailKey = hashIdentifier(body.email.trim().toLowerCase());
    this.sensitiveRateLimitService.check(`signup:${ipKey}:${emailKey}`, 10, 60 * 60_000);
    try {
      return await this.authService.signup(body, context);
    } catch (error) {
      this.logAuthFailure('POST /api/auth/signup', req, error);
      throw error;
    }
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() body: SignupDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole }; emailDeliveryWarning?: string }> {
    requireRequestedWithHeader(req);
    const context = getRequestContext(req);
    const ipKey = context.ip ?? 'unknown';
    const emailKey = hashIdentifier(body.email.trim().toLowerCase());
    this.sensitiveRateLimitService.check(`signup:${ipKey}:${emailKey}`, 10, 60 * 60_000);
    try {
      return await this.authService.signup(body, context);
    } catch (error) {
      this.logAuthFailure('POST /api/auth/register', req, error);
      throw error;
    }
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Query('tenantId') tenantId?: string,
    @Query('tenantSlug') tenantSlug?: string,
  ): Promise<LoginResponseUnion> {
    // Keep /api/auth/login usable for CLI/Postman-based admin/dev testing flows that do not set X-Requested-With.
    const context = getRequestContext(req);
    const ipKey = context.ip ?? 'unknown';
    const emailKey = hashIdentifier(body.email.trim().toLowerCase());
    this.sensitiveRateLimitService.check(`login:${ipKey}:${emailKey}`, 12, 15 * 60_000);
    try {
      return await this.authService.login({
        ...body,
        tenantId: body.tenantId ?? tenantId,
        tenantSlug: body.tenantSlug ?? tenantSlug,
      }, context);
    } catch (error) {
      this.logAuthFailure('POST /api/auth/login', req, error);
      throw error;
    }
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('admin/login')
  async adminLogin(
    @Body() body: LoginDto,
    @Req() req: Request,
  ): Promise<LoginResponseUnion> {
    const context = getRequestContext(req);
    const ipKey = context.ip ?? 'unknown';
    const emailKey = hashIdentifier(body.email.trim().toLowerCase());
    this.sensitiveRateLimitService.check(`admin-login:${ipKey}:${emailKey}`, 8, 15 * 60_000);
    try {
      return await this.authService.adminLogin(body, context);
    } catch (error) {
      this.logAuthFailure('POST /api/auth/admin/login', req, error);
      throw error;
    }
  }


  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login/otp/verify')
  async verifyLoginOtp(
    @Req() req: Request,
    @Body() body: VerifyLoginOtpDto,
  ): Promise<LoginSuccessResponseDto> {
    return this.authService.verifyLoginOtp(body, getRequestContext(req));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login/otp/resend')
  async resendLoginOtp(
    @Req() req: Request,
    @Body() body: ResendLoginOtpDto,
  ): Promise<ResendLoginOtpResponseDto> {
    return this.authService.resendLoginOtp(body, getRequestContext(req));
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('register-with-invite')
  registerWithInvite(@Body() body: RegisterWithInviteDto, @Req() req: Request) {
    requireRequestedWithHeader(req);
    return this.authService.registerWithInvite(body, getRequestContext(req));
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body() body: RefreshDto, @Req() req: Request): Promise<{ accessToken: string; refreshToken: string; me: AuthMeResponseDto }> {
    return this.authService.refresh(body.refreshToken, getRequestContext(req));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification-authenticated')
  @HttpCode(200)
  resendVerificationAuthenticated(@Req() req: AuthenticatedRequest): Promise<{ ok: true; message: string }> {
    const context = getRequestContext(req);
    const ipKey = context.ip ?? 'unknown';
    this.sensitiveRateLimitService.check(`resend:${ipKey}:${req.user.id}`, 20, 60 * 60_000);

    return this.authService.resendVerification(undefined, req.user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('resend-verification')
  @HttpCode(200)
  resendVerification(@Body() body: ResendVerificationDto, @Req() req: Request): Promise<{ ok: true; message: string }> {
    requireRequestedWithHeader(req);
    const context = getRequestContext(req);
    const emailKey = body.email ? hashIdentifier(body.email.trim().toLowerCase()) : 'unknown';
    const ipKey = context.ip ?? 'unknown';
    this.sensitiveRateLimitService.check(`resend:${ipKey}:${emailKey}`, 20, 60 * 60_000);

    return this.authService.resendVerification(body.email);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto): Promise<{ ok: true }> {
    return this.authService.verifyEmail(body.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-context')
  setContext(@Req() req: AuthenticatedRequest, @Body() body: SetContextDto): Promise<{ accessToken: string; me: AuthMeResponseDto }> {
    return this.authService.setContext(req.user.id, body.tenantId, body.gymId ?? body.locationId, body.mode);
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-mode')
  setMode(@Req() req: AuthenticatedRequest, @Body() body: SetModeDto): Promise<AuthMeResponseDto> {
    return this.authService.setMode(req.user.id, body.tenantId, body.mode, body.locationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthenticatedRequest): Promise<AuthMeResponseDto> {
    try {
      return await this.authService.me(req.user.id, {
        tenantId: req.user.activeTenantId,
        gymId: req.user.activeGymId,
        role: req.user.activeRole,
      });
    } catch (error) {
      this.logAuthFailure('GET /api/auth/me', req, error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('logout')
  logout(@Req() req: AuthenticatedRequest, @Body() body: LogoutDto): Promise<{ ok: true }> {
    return this.authService.logout(req.user.id, body);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request): Promise<{ ok: true }> {
    requireRequestedWithHeader(req);
    const context = getRequestContext(req);
    const ipKey = context.ip ?? 'unknown';
    const emailKey = hashIdentifier(body.email.trim().toLowerCase());
    this.sensitiveRateLimitService.check(`forgot:${ipKey}:${emailKey}`, 8, 60 * 60_000);
    return this.authService.forgotPassword(body.email, context);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto, @Req() req: Request): Promise<{ ok: true }> {
    requireRequestedWithHeader(req);
    const context = getRequestContext(req);
    const ipKey = context.ip ?? 'unknown';
    this.sensitiveRateLimitService.check(`reset:${ipKey}`, 8, 60 * 60_000);
    return this.authService.resetPassword(body.token, body.newPassword, context);
  }
}
