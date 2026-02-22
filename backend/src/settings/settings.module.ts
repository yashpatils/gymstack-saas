import { Module } from '@nestjs/common';
import { LocationGuard } from '../auth/guards/location.guard';
import { RolesGuard as MembershipRolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [SettingsService, TenantGuard, LocationGuard, MembershipRolesGuard],
  exports: [SettingsService],
})
export class SettingsModule {}
