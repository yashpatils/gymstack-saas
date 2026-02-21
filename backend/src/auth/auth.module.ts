import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { AuthTokenService } from './auth-token.service';
import { RequireVerifiedEmailGuard } from './guards/require-verified-email.guard';
import { SensitiveRateLimitService } from '../common/sensitive-rate-limit.service';
import { OAuthIdentityService } from './oauth-identity.service';
import { OAuthStateService } from './oauth-state.service';
import { OauthController } from './oauth.controller';
import { RefreshTokenService } from './refresh-token.service';
import { InvitesModule } from '../invites/invites.module';
import { BillingModule } from '../billing/billing.module';
import { getJwtSecret } from '../common/env.util';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationsModule,
    EmailModule,
    PassportModule,
    InvitesModule,
    BillingModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: getJwtSecret(configService),
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  controllers: [AuthController, OauthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, AuthTokenService, RequireVerifiedEmailGuard, SensitiveRateLimitService, OAuthStateService, OAuthIdentityService, RefreshTokenService],
  exports: [RequireVerifiedEmailGuard, AuthService],
})
export class AuthModule {}
