import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

interface LoginBody {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  @Post('signup')
  signup(@Body() _body: Record<string, unknown>): { success: true } {
    return { success: true };
  }

  @Post('login')
  login(@Body() body: LoginBody): { accessToken: string } {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('Email and password are required');
    }

    const accessToken = this.jwtService.sign({ email: body.email });
    return { accessToken };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(
    @Req() request: Request & { user?: { email?: string } },
  ): { email: string } {
    const email = request.user?.email;

    if (!email) {
      throw new BadRequestException('Missing user email');
    }

    return { email };
  }
}
