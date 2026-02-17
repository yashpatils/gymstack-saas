import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { BillingModule } from './billing/billing.module';
import { DebugModule } from './debug/debug.module';
import { DomainsModule } from './domains/domains.module';
import { GymsModule } from './gyms/gyms.module';
import { InvitesModule } from './invites/invites.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PublicModule } from './public/public.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { AccountModule } from './account/account.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { LocationMembershipsModule } from './location-memberships/location-memberships.module';
import { SensitiveRateLimitService } from './common/sensitive-rate-limit.service';
import { LocationAppModule } from './location-app/location-app.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { LeadsModule } from './leads/leads.module';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 120,
        },
      ],
    }),
    AuthModule,
    AuditModule,
    BillingModule,
    DebugModule,
    DomainsModule,
    GymsModule,
    InvitesModule,
    PrismaModule,
    OrganizationsModule,
    NotificationsModule,
    PublicModule,
    UsersModule,
    SettingsModule,
    AdminModule,
    AccountModule,
    OnboardingModule,
    LocationAppModule,
    FeatureFlagsModule,
    LeadsModule,
    DemoModule,
  ],
  controllers: [AppController],
  providers: [
    SensitiveRateLimitService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
