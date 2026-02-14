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
import { RequireVerifiedEmailGuard } from './require-verified-email.guard';
import { SensitiveRateLimitService } from '../common/sensitive-rate-limit.service';
import { OAuthIdentityService } from './oauth-identity.service';
import { OAuthStateService } from './oauth-state.service';
import { OauthController } from './oauth.controller';
import { RefreshTokenService } from './refresh-token.service';
import { InvitesModule } from '../invites/invites.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationsModule,
    EmailModule,
    PassportModule,
    InvitesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'JWT_SECRET is required and must be provided via environment variables before starting the backend.',
          );
        }

        return {
          secret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  controllers: [AuthController, OauthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, AuthTokenService, RequireVerifiedEmailGuard, SensitiveRateLimitService, OAuthStateService, OAuthIdentityService, RefreshTokenService],
  exports: [RequireVerifiedEmailGuard],
})
export class AuthModule {}
