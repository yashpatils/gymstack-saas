import { Controller, Get, Headers, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PublicService } from './public.service';
import { PublicLocationByHostResponseDto } from './dto/public-location-by-host.dto';

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

  @Get('location-by-host')
  locationByHost(
    @Headers('host') hostHeader: string | undefined,
    @Query('host') hostQuery: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicLocationByHostResponseDto> {
    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return this.publicService.getLocationByHost(hostQuery?.trim() || hostHeader || '');
  }

  @Get('gyms/:slug')
  gymBySlug(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    return this.publicService.getPublicGymBySlug(slug);
  }
}
