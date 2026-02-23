import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { VerifiedEmailRequired } from '../auth/decorators/verified-email-required.decorator';
import { User } from '../users/user.model';
import { UpdateOrgDto } from './dto/update-org.dto';
import { OrganizationsService } from './organizations.service';

@Controller('orgs')
@VerifiedEmailRequired()
export class OrgsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  createOrg(@Req() req: { user?: User }, @Body() body: UpdateOrgDto) {
    if (!req.user) throw new ForbiddenException('Missing user');
    return this.organizationsService.createOrg(req.user, body.name);
  }

  @Get()
  listOrgs(@Req() req: { user?: User }) {
    if (!req.user) throw new ForbiddenException('Missing user');
    return this.organizationsService.listUserOrgs(req.user.id);
  }

  @Get(':id')
  @UseGuards(TenantGuard)
  getOrgDetail(@Req() req: { user?: User; activeTenantId?: string }, @Param('id') id: string) {
    if (!req.user) throw new ForbiddenException('Missing user');
    if (req.activeTenantId !== id) throw new ForbiddenException('Tenant context must match organization in path');
    return this.organizationsService.getOrgDetailForMember(req.user.id, id);
  }

  @Patch(':id')
  @UseGuards(TenantGuard)
  patchOrg(@Req() req: { user?: User; activeTenantId?: string }, @Param('id') id: string, @Body() body: UpdateOrgDto) {
    if (!req.user) throw new ForbiddenException('Missing user');
    if (req.activeTenantId !== id) throw new ForbiddenException('Tenant context must match organization in path');
    return this.organizationsService.updateOrgById(req.user, id, body.name);
  }

  @Get(':id/members')
  @UseGuards(TenantGuard)
  getOrgMembers(@Req() req: { user?: User; activeTenantId?: string }, @Param('id') id: string) {
    if (!req.user) throw new ForbiddenException('Missing user');
    if (req.activeTenantId !== id) throw new ForbiddenException('Tenant context must match organization in path');
    return this.organizationsService.listOrgMembers(req.user.id, id);
  }

  @Patch(':id/members/:membershipId')
  @UseGuards(TenantGuard)
  patchOrgMember(
    @Req() req: { user?: User; activeTenantId?: string },
    @Param('id') id: string,
    @Param('membershipId') membershipId: string,
    @Body() body: { role?: MembershipRole; status?: MembershipStatus },
  ) {
    if (!req.user) throw new ForbiddenException('Missing user');
    if (req.activeTenantId !== id) throw new ForbiddenException('Tenant context must match organization in path');
    return this.organizationsService.updateOrgMembership(req.user, id, membershipId, body);
  }
}
