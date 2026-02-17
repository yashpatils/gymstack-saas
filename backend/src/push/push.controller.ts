import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscribePushDto } from './dto/subscribe.dto';
import { UnsubscribePushDto } from './dto/unsubscribe.dto';
import { PushService } from './push.service';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    activeTenantId?: string;
    activeGymId?: string;
    activeLocationId?: string;
  };
};

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Missing user');
    }
    return req.user;
  }

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.pushService.getPublicVapidKey() };
  }

  @Post('subscribe')
  async subscribe(@Req() req: AuthenticatedRequest, @Body() body: SubscribePushDto) {
    const user = this.requireUser(req);
    await this.pushService.subscribe(
      user.id,
      user.activeTenantId ?? null,
      user.activeLocationId ?? user.activeGymId ?? null,
      body.endpoint,
      body.keys.p256dh,
      body.keys.auth,
      req.headers['user-agent'],
    );
    return { ok: true };
  }

  @Post('unsubscribe')
  async unsubscribe(@Req() req: AuthenticatedRequest, @Body() body: UnsubscribePushDto) {
    const user = this.requireUser(req);
    await this.pushService.unsubscribe(user.id, body.endpoint);
    return { ok: true };
  }
}

