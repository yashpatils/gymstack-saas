import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [DomainsController],
  providers: [DomainsService],
})
export class DomainsModule {}
