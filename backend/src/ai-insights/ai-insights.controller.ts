import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiInsightsService } from './ai-insights.service';
import { User } from '../users/user.model';

@Controller('ai')
@UseGuards(JwtAuthGuard)
@VerifiedEmailRequired()
export class AiInsightsController {
  constructor(private readonly aiInsightsService: AiInsightsService) {}

  @Get('weekly-brief')
  getWeeklyBrief(@Req() req: { user: User }) {
    return this.aiInsightsService.getWeeklyBrief(req.user);
  }
}
