import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SecurityService } from './security.service';
import {
  RequestDisableTwoStepEmailDto,
  RequestEnableTwoStepEmailDto,
  TwoStepOtpChallengeResponseDto,
  TwoStepToggleResponseDto,
  VerifyDisableTwoStepEmailDto,
  VerifyEnableTwoStepEmailDto,
} from './dto/two-step-email.dto';

@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Post('two-step/email/request-enable')
  async requestEnableTwoStepEmail(
    @Req() req: { user: { id: string; email: string }; ip?: string; headers: Record<string, string | string[] | undefined> },
    @Body() dto: RequestEnableTwoStepEmailDto,
  ): Promise<TwoStepOtpChallengeResponseDto> {
    return this.securityService.requestEnableTwoStepEmail(req.user, dto, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  @Post('two-step/email/verify-enable')
  async verifyEnableTwoStepEmail(
    @Req() req: { user: { id: string; email: string }; ip?: string; headers: Record<string, string | string[] | undefined> },
    @Body() dto: VerifyEnableTwoStepEmailDto,
  ): Promise<TwoStepToggleResponseDto> {
    return this.securityService.verifyEnableTwoStepEmail(req.user, dto, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  @Post('two-step/email/request-disable')
  async requestDisableTwoStepEmail(
    @Req() req: { user: { id: string; email: string }; ip?: string; headers: Record<string, string | string[] | undefined> },
    @Body() dto: RequestDisableTwoStepEmailDto,
  ): Promise<TwoStepOtpChallengeResponseDto> {
    return this.securityService.requestDisableTwoStepEmail(req.user, dto, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  @Post('two-step/email/verify-disable')
  async verifyDisableTwoStepEmail(
    @Req() req: { user: { id: string; email: string }; ip?: string; headers: Record<string, string | string[] | undefined> },
    @Body() dto: VerifyDisableTwoStepEmailDto,
  ): Promise<TwoStepToggleResponseDto> {
    return this.securityService.verifyDisableTwoStepEmail(req.user, dto, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }
}
