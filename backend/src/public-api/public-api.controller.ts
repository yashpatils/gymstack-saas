import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { PublicApiAuthGuard } from './public-api-auth.guard';
import { PublicApiCtx } from './public-api.decorator';
import { PublicApiService } from './public-api.service';
import type { PublicApiContext } from './public-api.types';

@UseGuards(PublicApiAuthGuard)
@Controller('public/v1')
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Get('locations')
  locations(@PublicApiCtx() ctx: PublicApiContext, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.publicApiService.locations(ctx.tenantId, Number(page), Number(pageSize));
  }

  @Get('members')
  members(@PublicApiCtx() ctx: PublicApiContext, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.publicApiService.members(ctx.tenantId, Number(page), Number(pageSize));
  }

  @Get('classes')
  classes(@PublicApiCtx() ctx: PublicApiContext, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.publicApiService.classes(ctx.tenantId, Number(page), Number(pageSize));
  }

  @Get('sessions')
  sessions(
    @PublicApiCtx() ctx: PublicApiContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.publicApiService.sessions(ctx.tenantId, { from, to, page: Number(page), pageSize: Number(pageSize) });
  }

  @Post('bookings')
  createBooking(@PublicApiCtx() ctx: PublicApiContext, @Body() body: { sessionId: string; memberEmail: string }) {
    return this.publicApiService.createBooking(ctx.tenantId, body);
  }
}
