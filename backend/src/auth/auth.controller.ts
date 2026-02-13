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
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('signup')
  signup(
    @Body() body: SignupDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; role: MembershipRole } }> {
    return this.authService.signup(body, getRequestContext(req));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(
    @Body() body: LoginDto,
    @Req() req: Request,
  ): Promise<{ accessToken: string; user: MeDto; memberships: MembershipDto[]; activeContext?: { tenantId: string; gymId?: string | null; role: MembershipRole } }> {
    return this.authService.login(body, getRequestContext(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-context')
  setContext(@Req() req: { user: RequestUser }, @Body() body: SetContextDto): Promise<{ accessToken: string }> {
    return this.authService.setContext(req.user.id, body.tenantId, body.gymId);
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

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('logout')
  logout(): { ok: true } {
    return { ok: true };
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
