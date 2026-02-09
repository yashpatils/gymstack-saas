import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth.controller';
import { GymsController } from './gyms/gyms.controller';
import { GymsService } from './gyms/gyms.service';
import { PrismaService } from './prisma.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

@Module({
  controllers: [
    AppController,
    AuthController,
    UsersController,
    GymsController,
  ],
  providers: [PrismaService, UsersService, GymsService],
})
export class AppModule {}
