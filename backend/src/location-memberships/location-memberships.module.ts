import { Module } from '@nestjs/common';
import { LocationMembershipsController } from './location-memberships.controller';
import { GymMembershipAdminController } from './gym-membership-admin.controller';
import { LocationMembershipsService } from './location-memberships.service';
import { ActiveClientMembershipGuard } from './active-client-membership.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LocationMembershipsController, GymMembershipAdminController],
  providers: [LocationMembershipsService, ActiveClientMembershipGuard],
  exports: [LocationMembershipsService, ActiveClientMembershipGuard],
})
export class LocationMembershipsModule {}
