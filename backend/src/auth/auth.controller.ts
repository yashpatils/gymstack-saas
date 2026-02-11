import { Body, Controller, Get, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { MeDto } from './dto/me.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthExceptionFilter } from './auth-exception.filter';

@UseFilters(AuthExceptionFilter)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: SignupDto): Promise<{ accessToken: string; user: MeDto }> {
    return this.authService.signup(body);
  }

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

  @Post('logout')
  logout(): { ok: true } {
    return { ok: true };
  }
}
