import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.model';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ValidateInviteDto } from './dto/validate-invite.dto';
import { InvitesService } from './invites.service';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { RevokeInviteDto } from './dto/revoke-invite.dto';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @UseGuards(JwtAuthGuard, RequireVerifiedEmailGuard)
  @Post()
  createInvite(@Req() req: { user: User }, @Body() body: CreateInviteDto) {
    return this.invitesService.createInvite(req.user, body);
  }

  @Post('validate')
  validateInvite(@Body() body: ValidateInviteDto) {
    return this.invitesService.validateInvite(body.token);
  }

  @UseGuards(JwtAuthGuard, RequireVerifiedEmailGuard)
  @Post('revoke')
  revokeInvite(@Req() req: { user: User }, @Body() body: RevokeInviteDto) {
    return this.invitesService.revokeInvite(req.user, body.inviteId);
  }
}
