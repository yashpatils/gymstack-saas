import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.model';
import { CreateDomainDto } from './dto/create-domain.dto';
import { DomainsService } from './domains.service';

@Controller('domains')
@UseGuards(JwtAuthGuard)
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Post()
  create(@Req() req: { user: User }, @Body() body: CreateDomainDto) {
    return this.domainsService.create(req.user, body);
  }

  @Get()
  list(@Req() req: { user: User }) {
    return this.domainsService.list(req.user);
  }

  @Post(':id/verify')
  verify(@Req() req: { user: User }, @Param('id') id: string) {
    return this.domainsService.verify(req.user, id);
  }

  @Delete(':id')
  remove(@Req() req: { user: User }, @Param('id') id: string) {
    return this.domainsService.remove(req.user, id);
  }
}
