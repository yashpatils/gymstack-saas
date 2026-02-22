import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RequestDeleteDto } from './dto/request-delete.dto';
import { ConfirmDeleteDto } from './dto/confirm-delete.dto';
import { AccountService } from './account.service';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { UpdateDisplayNameDto } from './dto/update-display-name.dto';
import { RequestEmailChangeOtpDto } from './dto/request-email-change-otp.dto';
import { VerifyEmailChangeOtpDto } from './dto/verify-email-change-otp.dto';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @VerifiedEmailRequired()
  @Patch('display-name')
  updateDisplayName(@Req() req: { user: { id?: string; userId?: string; sub?: string } }, @Body() body: UpdateDisplayNameDto) {
    return this.accountService.updateDisplayName(this.getUserId(req), body.name);
  }

  @VerifiedEmailRequired()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('email-change/request-otp')
  requestEmailChangeOtp(@Req() req: { user: { id?: string; userId?: string; sub?: string } }, @Body() body: RequestEmailChangeOtpDto) {
    return this.accountService.requestEmailChangeOtp(this.getUserId(req), body.newEmail);
  }

  @VerifiedEmailRequired()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('email-change/verify-otp')
  verifyEmailChangeOtp(@Req() req: { user: { id?: string; userId?: string; sub?: string } }, @Body() body: VerifyEmailChangeOtpDto) {
    return this.accountService.verifyEmailChangeOtp(this.getUserId(req), body.newEmail, body.otp);
  }

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
