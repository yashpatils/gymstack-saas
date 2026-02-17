import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { User } from '../users/user.model';
import { RetentionService } from './retention.service';

@Controller('tenant')
@UseGuards(JwtAuthGuard)
@VerifiedEmailRequired()
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Get('health')
  getHealth(@Req() req: { user: User }) {
    return this.retentionService.getTenantHealth(req.user);
  }
}
