import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';

type SignupRequest = {
  email: string;
  password: string;
  role?: Role;
};

type LoginRequest = {
  email: string;
  password: string;
};

export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: Role;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: SignupRequest): Promise<AuthenticatedUser> {
    return this.authService.signup(body);
  }

  @Post('login')
  login(@Body() body: LoginRequest): Promise<{ accessToken: string }> {
    return this.authService.login(body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: { user: AuthenticatedUser }): AuthenticatedUser {
    return req.user;
  }
}
