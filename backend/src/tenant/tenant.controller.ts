import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { CreateInviteDto } from '../invites/dto/create-invite.dto';
import { ValidateInviteDto } from '../invites/dto/validate-invite.dto';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { User } from '../users/user.model';
import { TenantService } from './tenant.service';
import { UpdateMemberDto } from './dto/update-member.dto';

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
}
