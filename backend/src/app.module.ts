import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth.controller';
import { AuthModule } from './auth/auth.module';
import { GymsController } from './gyms/gyms.controller';
import { RolesGuard } from './guards/roles.guard';
import { UsersController } from './users/users.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    AppController,
    AuthController,
    GymsController,
    UsersController,
  ],
  providers: [RolesGuard],
})
export class AppModule {}
