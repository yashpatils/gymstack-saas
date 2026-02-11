import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { BillingModule } from './billing/billing.module';
import { DebugModule } from './debug/debug.module';
import { GymsModule } from './gyms/gyms.module';
import { InvitesModule } from './invites/invites.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 100,
        },
      ],
    }),
    AuthModule,
    AuditModule,
    BillingModule,
    DebugModule,
    GymsModule,
    InvitesModule,
    PrismaModule,
    OrganizationsModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
