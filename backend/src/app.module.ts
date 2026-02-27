import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
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
import { TenantRateLimitGuard } from './common/tenant-rate-limit.guard';
import { DistributedRateLimitService } from './common/distributed-rate-limit.service';
import { LocationAppModule } from './location-app/location-app.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TenantModule } from './tenant/tenant.module';
import { DeveloperModule } from './developer/developer.module';
import { DevelopersModule } from './developers/developers.module';
import { PublicApiModule } from './public-api/public-api.module';
import { AiInsightsModule } from './ai-insights/ai-insights.module';
import { SecurityModule } from './security/security.module';
import { ClientPortalModule } from './client-portal/client-portal.module';

const shouldEnableDebugRoutes =
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_ROUTES === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttlMs = Number.parseInt(configService.get<string>('THROTTLE_TTL_MS') ?? '60000', 10);
        const limit = Number.parseInt(configService.get<string>('THROTTLE_LIMIT') ?? '60', 10);

        return {
          throttlers: [
            {
              ttl: Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 60_000,
              limit: Number.isFinite(limit) && limit > 0 ? limit : 60,
            },
          ],
        };
      },
    }),
    AuthModule,
    AuditModule,
    BillingModule,
    ...(shouldEnableDebugRoutes ? [DebugModule] : []),
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
    LocationMembershipsModule,
    LocationAppModule,
    FeatureFlagsModule,
    AnalyticsModule,
    TenantModule,
    PublicApiModule,
    DeveloperModule,
    DevelopersModule,
    AiInsightsModule,
    SecurityModule,
    ClientPortalModule,
  ],
  controllers: [AppController],
  providers: [
    SensitiveRateLimitService,
    DistributedRateLimitService,
    TenantRateLimitGuard,
    {
      provide: APP_GUARD,
      useClass: TenantRateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
