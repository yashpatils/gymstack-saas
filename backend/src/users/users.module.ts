import { Module } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
})
export class UsersModule {}
