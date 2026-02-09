import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthController } from './auth.controller';
import { securityConfig } from './config/security.config';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: securityConfig.throttleTtl,
      limit: securityConfig.throttleLimit,
    }),
  ],
  controllers: [AppController, AuthController],
})
export class AppModule {}
