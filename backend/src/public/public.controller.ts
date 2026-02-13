import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('locations/by-slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.publicService.getLocationBySlug(slug);
  }

  @Get('sites/resolve')
  resolve(@Query('host') host: string) {
    return this.publicService.resolveByHost(host);
  }
}
