import { Body, Controller, ForbiddenException, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { User } from '../users/user.model';
import { UpdateOrgDto } from './dto/update-org.dto';
import { OrganizationsService } from './organizations.service';

@Controller('org')
@UseGuards(JwtAuthGuard, RequireVerifiedEmailGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  getOrg(@Req() req: { user?: User }) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.organizationsService.getOrg(user.orgId);
  }

  @Patch()
  renameOrg(@Req() req: { user?: User }, @Body() body: UpdateOrgDto) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Missing user');
    }

    return this.organizationsService.renameOrg(user.orgId, user.id, body.name);
  }
}
