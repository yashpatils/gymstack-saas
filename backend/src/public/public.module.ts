import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { CacheModule } from '../cache/cache.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [PrismaModule, BillingModule, CacheModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
