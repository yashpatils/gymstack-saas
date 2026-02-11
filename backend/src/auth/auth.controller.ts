import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { MeDto } from './dto/me.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthExceptionFilter } from './auth-exception.filter';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@UseFilters(AuthExceptionFilter)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('signup')
  signup(@Body() body: SignupDto): Promise<{ accessToken: string; user: MeDto }> {
    return this.authService.signup(body);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(
    @Body() body: LoginDto,
  ): Promise<{ accessToken: string; user: MeDto }> {
    return this.authService.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: MeDto }): MeDto {
    return {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      orgId: req.user.orgId,
    };
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
