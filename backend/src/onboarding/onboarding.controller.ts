import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { User } from '../users/user.model';
import { OwnerOpsModeDto } from './dto/owner-ops-mode.dto';
import { OnboardingService } from './onboarding.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

@Controller('onboarding')
@VerifiedEmailRequired()
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('owner-ops-mode')
  setOwnerOpsMode(@Req() req: { user: User }, @Body() body: OwnerOpsModeDto) {
    return this.onboardingService.setOwnerOpsMode(req.user, body);
  }
}
