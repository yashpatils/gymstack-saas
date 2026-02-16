import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RequestDeleteDto } from './dto/request-delete.dto';
import { ConfirmDeleteDto } from './dto/confirm-delete.dto';
import { AccountService } from './account.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @VerifiedEmailRequired()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('request-delete')
  requestDelete(@Req() req: { user: { id: string } }, @Body() body: RequestDeleteDto): Promise<{ ok: true }> {
    return this.accountService.requestDelete(req.user.id, body.password);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('confirm-delete')
  confirmDelete(@Body() body: ConfirmDeleteDto): Promise<{ ok: true }> {
    return this.accountService.confirmDelete(body.token);
  }
}
