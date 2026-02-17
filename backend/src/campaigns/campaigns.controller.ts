import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { User } from '../users/user.model';
import { CampaignsService } from './campaigns.service';
import { GenerateCampaignDto, SendCampaignDto } from './dto/campaign.dto';

@Controller('api/campaigns')
@UseGuards(JwtAuthGuard)
@VerifiedEmailRequired()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post('generate')
  generate(@Req() req: { user: User }, @Body() dto: GenerateCampaignDto) {
    return this.campaignsService.generateDraft(req.user, dto);
  }

  @Post('send')
  send(@Req() req: { user: User }, @Body() dto: SendCampaignDto) {
    return this.campaignsService.sendCampaign(req.user, dto);
  }

  @Get()
  list(@Req() req: { user: User }) {
    return this.campaignsService.listCampaigns(req.user);
  }
}
