import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.model';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ValidateInviteDto } from './dto/validate-invite.dto';
import { InvitesService } from './invites.service';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @UseGuards(JwtAuthGuard, RequireVerifiedEmailGuard)
  @Post()
  createInvite(@Req() req: { user: User }, @Body() body: CreateInviteDto) {
    return this.invitesService.createInvite(req.user, body);
  }

  @Post('accept')
  acceptInvite(@Body() body: AcceptInviteDto) {
    return this.invitesService.acceptInvite(body);
  }

  @Post('validate')
  validateInvite(@Body() body: ValidateInviteDto) {
    return this.invitesService.validateInvite(body.token);
  }
}
