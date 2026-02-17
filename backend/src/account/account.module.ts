import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AuthTokenService } from '../auth/auth-token.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, EmailModule, AuditModule],
  controllers: [AccountController],
  providers: [AccountService, AuthTokenService],
})
export class AccountModule {}
