import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { User } from '../users/user.model';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ValidateInviteDto } from './dto/validate-invite.dto';
import { InvitesService } from './invites.service';
import { RevokeInviteDto } from './dto/revoke-invite.dto';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @VerifiedEmailRequired()
  @Post('location-staff')
  createLocationStaffInvite(@Req() req: { user: User }, @Body() body: Omit<CreateInviteDto, 'role'>) {
    return this.invitesService.createInvite(req.user, { ...body, role: 'GYM_STAFF_COACH' });
  }

  @VerifiedEmailRequired()
  @Post('clients')
  createClientInvite(@Req() req: { user: User }, @Body() body: Omit<CreateInviteDto, 'role'>) {
    return this.invitesService.createInvite(req.user, { ...body, role: 'CLIENT' });
  }

  @VerifiedEmailRequired()
  @Post()
  createInvite(@Req() req: { user: User }, @Body() body: CreateInviteDto) {
    return this.invitesService.createInvite(req.user, body);
  }

  @Get('validate')
  validateInviteQuery(@Query() query: ValidateInviteDto) {
    return this.invitesService.validateInvite(query.token);
  }

  @Post('validate')
  validateInvite(@Body() body: ValidateInviteDto) {
    return this.invitesService.validateInvite(body.token);
  }

  @Post('consume-auth')
  @VerifiedEmailRequired()
  consumeInvite(@Req() req: { user: User }, @Body() body: ValidateInviteDto) {
    return this.invitesService.consumeByToken(body.token, req.user.email, req.user.id);
  }

  @VerifiedEmailRequired()
  @Get()
  listInvites(@Req() req: { user: User }, @Query('locationId') locationId?: string) {
    return this.invitesService.listInvites(req.user, locationId);
  }

  @VerifiedEmailRequired()
  @Delete(':id')
  revokeInviteById(@Req() req: { user: User }, @Param('id') inviteId: string) {
    return this.invitesService.revokeInvite(req.user, inviteId);
  }

  @VerifiedEmailRequired()
  @Post('revoke')
  revokeInvite(@Req() req: { user: User }, @Body() body: RevokeInviteDto) {
    return this.invitesService.revokeInvite(req.user, body.inviteId);
  }
}
