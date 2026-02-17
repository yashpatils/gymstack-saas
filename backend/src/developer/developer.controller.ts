import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeveloperService } from './developer.service';

@UseGuards(JwtAuthGuard)
@Controller('developer')
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  @Get('api-keys')
  apiKeys(@Req() req: { user: { activeTenantId?: string | null } }) {
    return this.developerService.listApiKeys(req.user);
  }

  @Post('api-keys')
  createApiKey(@Req() req: { user: { activeTenantId?: string | null } }, @Body() body: { name: string }) {
    return this.developerService.createApiKey(req.user, body.name);
  }

  @Post('api-keys/:id/revoke')
  revokeApiKey(@Req() req: { user: { activeTenantId?: string | null } }, @Param('id') id: string) {
    return this.developerService.revokeApiKey(req.user, id);
  }

  @Get('webhooks')
  webhooks(@Req() req: { user: { activeTenantId?: string | null } }) {
    return this.developerService.listWebhookEndpoints(req.user);
  }

  @Post('webhooks')
  createWebhook(@Req() req: { user: { activeTenantId?: string | null } }, @Body() body: { url: string; events: string[] }) {
    return this.developerService.createWebhookEndpoint(req.user, body);
  }

  @Post('webhooks/deliveries/:deliveryId/retry')
  retry(@Req() req: { user: { activeTenantId?: string | null } }, @Param('deliveryId') deliveryId: string) {
    return this.developerService.retryWebhookDelivery(req.user, deliveryId);
  }
}
