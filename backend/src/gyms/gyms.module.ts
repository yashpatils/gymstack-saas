import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { RolesGuard } from '../guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { GymsController } from './gyms.controller';
import { GymsService } from './gyms.service';

@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [GymsController],
  providers: [GymsService, RolesGuard],
})
export class GymsModule {}
