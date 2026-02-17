import { Body, Controller, Get, Post, Req } from '@nestjs/common';
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
  requestDelete(@Req() req: { user: { id?: string; userId?: string; sub?: string } }, @Body() body: RequestDeleteDto): Promise<{ ok: true }> {
    return this.accountService.requestDelete(this.getUserId(req), body.password);
  }

  @VerifiedEmailRequired()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('request-deletion')
  requestDeletion(@Req() req: { user: { id?: string; userId?: string; sub?: string } }, @Body() body: RequestDeleteDto): Promise<{ ok: true }> {
    return this.accountService.requestDelete(this.getUserId(req), body.password);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('confirm-delete')
  confirmDelete(@Body() body: ConfirmDeleteDto): Promise<{ ok: true }> {
    return this.accountService.confirmDelete(body.token);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('confirm-deletion')
  confirmDeletion(@Body() body: ConfirmDeleteDto): Promise<{ ok: true }> {
    return this.accountService.confirmDelete(body.token);
  }

  @VerifiedEmailRequired()
  @Post('cancel-deletion')
  cancelDeletion(@Req() req: { user: { id?: string; userId?: string; sub?: string } }): Promise<{ ok: true }> {
    return this.accountService.cancelDeletion(this.getUserId(req));
  }

  @VerifiedEmailRequired()
  @Get('deletion-status')
  getDeletionStatus(@Req() req: { user: { id?: string; userId?: string; sub?: string } }) {
    return this.accountService.getDeletionStatus(this.getUserId(req));
  }

  private getUserId(req: { user: { id?: string; userId?: string; sub?: string } }): string {
    return req.user.id ?? req.user.userId ?? req.user.sub ?? '';
  }
}
