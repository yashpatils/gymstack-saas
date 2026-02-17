import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { PublicApiAuthGuard } from './public-api-auth.guard';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [PrismaModule, WebhooksModule],
  controllers: [PublicApiController],
  providers: [PublicApiService, PublicApiAuthGuard],
})
export class PublicApiModule {}
