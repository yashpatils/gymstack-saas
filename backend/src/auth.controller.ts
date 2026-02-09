import { Body, Controller, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('signup')
  signup(@Body() _body: Record<string, unknown>): { success: true } {
    return { success: true };
  }

  @Post('login')
  login(@Body() _body: Record<string, unknown>): { success: true } {
    return { success: true };
  }
}
