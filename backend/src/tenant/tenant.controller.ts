import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { CreateInviteDto } from '../invites/dto/create-invite.dto';
import { ValidateInviteDto } from '../invites/dto/validate-invite.dto';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { User } from '../users/user.model';
import { TenantService } from './tenant.service';
import { UpdateMemberDto } from './dto/update-member.dto';
import { SlugAvailabilityQueryDto, SlugAvailabilityResponseDto } from './dto/slug-availability.dto';
import { RequestTenantSlugChangeDto, RequestTenantSlugChangeResponseDto } from './dto/request-tenant-slug-change.dto';
import { VerifyTenantSlugChangeDto, VerifyTenantSlugChangeResponseDto } from './dto/verify-tenant-slug-change.dto';
import { ResendTenantSlugChangeOtpDto, ResendTenantSlugChangeOtpResponseDto } from './dto/resend-tenant-slug-change.dto';

@Controller()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @VerifiedEmailRequired()
  @Get('tenant/members')
  members(@Req() req: { user: User }) {
    return this.tenantService.listMembers(req.user);
  }

  @VerifiedEmailRequired()
  @Patch('tenant/members/:memberId')
  updateMember(@Req() req: { user: User }, @Param('memberId') memberId: string, @Body() body: UpdateMemberDto) {
    return this.tenantService.updateMember(req.user, memberId, body);
  }

  @VerifiedEmailRequired()
  @Get('tenant/invites')
  invites(@Req() req: { user: User }) {
    return this.tenantService.listInvites(req.user);
  }

  @VerifiedEmailRequired()
  @Post('tenant/invites')
  createInvite(@Req() req: { user: User }, @Body() body: CreateInviteDto) {
    return this.tenantService.createInvite(req.user, body);
  }

  @VerifiedEmailRequired()
  @Post('tenant/invites/:id/revoke')
  revokeInvite(@Req() req: { user: User }, @Param('id') inviteId: string) {
    return this.tenantService.revokeInvite(req.user, inviteId);
  }

  @Post('invites/consume')
  consumeInvite(@Req() req: { user?: User }, @Body() body: ValidateInviteDto) {
    return this.tenantService.consumeInvite(body.token, req.user?.id, req.user?.email);
  }

  @VerifiedEmailRequired()
  @Get('tenant/slug-availability')
  slugAvailability(@Req() req: { user: User }, @Query('slug') slug?: string) {
    return this.tenantService.checkSlugAvailability(req.user, slug ?? '');
  }

  @VerifiedEmailRequired()
  @Get('tenants/slug-availability')
  slugAvailabilityV2(@Req() req: { user: User }, @Query() query: SlugAvailabilityQueryDto): Promise<SlugAvailabilityResponseDto> {
    return this.tenantService.getSlugAvailability(req.user.id, query);
  }

  @VerifiedEmailRequired()
  @Post('tenants/:tenantId/slug/change/request')
  requestTenantSlugChange(
    @Req() req: { user: User; ip?: string; headers: Record<string, string | string[] | undefined> },
    @Param('tenantId') tenantId: string,
    @Body() body: RequestTenantSlugChangeDto,
  ): Promise<RequestTenantSlugChangeResponseDto> {
    return this.tenantService.requestTenantSlugChange(req.user, tenantId, body, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  @VerifiedEmailRequired()
  @Post('tenants/:tenantId/slug/change/verify')
  verifyTenantSlugChange(
    @Req() req: { user: User; ip?: string; headers: Record<string, string | string[] | undefined> },
    @Param('tenantId') tenantId: string,
    @Body() body: VerifyTenantSlugChangeDto,
  ): Promise<VerifyTenantSlugChangeResponseDto> {
    return this.tenantService.verifyTenantSlugChange(req.user, tenantId, body, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  @VerifiedEmailRequired()
  @Post('tenants/:tenantId/slug/change/resend')
  resendTenantSlugChangeOtp(
    @Req() req: { user: User; ip?: string; headers: Record<string, string | string[] | undefined> },
    @Param('tenantId') tenantId: string,
    @Body() body: ResendTenantSlugChangeOtpDto,
  ): Promise<ResendTenantSlugChangeOtpResponseDto> {
    return this.tenantService.resendTenantSlugChangeOtp(req.user, tenantId, body, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }
}
