import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [PrismaModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
