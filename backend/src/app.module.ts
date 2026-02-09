import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [AppController],
})
export class AppModule {}
