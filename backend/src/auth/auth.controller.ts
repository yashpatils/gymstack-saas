import { Body, Controller, Get, HttpException, Logger, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
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
    this.logger.error(
      JSON.stringify({
        event: 'auth_endpoint_failure',
        endpoint,
        requestId: req.requestId ?? 'unknown',
        statusCode,
        message,
      }),
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('signup')
  async signup(
    @Body() body: SignupDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole }; emailDeliveryWarning?: string }> {
    try {
      return await this.authService.signup(body, getRequestContext(req));
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
    try {
      return await this.authService.signup(body, getRequestContext(req));
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
  ): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole }; emailDeliveryWarning?: string }> {
    try {
      return await this.authService.login(body, getRequestContext(req));
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
  ): Promise<{ accessToken: string; refreshToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; locationId?: string | null; role: MembershipRole }; emailDeliveryWarning?: string }> {
    try {
      return await this.authService.adminLogin(body, getRequestContext(req));
    } catch (error) {
      this.logAuthFailure('POST /api/auth/admin/login', req, error);
      throw error;
    }
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
  setContext(@Req() req: AuthenticatedRequest, @Body() body: SetContextDto): Promise<{ accessToken: string; me: AuthMeResponseDto }> {
    return this.authService.setContext(req.user.id, body.tenantId, body.gymId ?? body.locationId);
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
  forgotPassword(@Body() body: ForgotPasswordDto): Promise<{ ok: true }> {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto): Promise<{ ok: true }> {
    return this.authService.resetPassword(body.token, body.newPassword);
  }
}
