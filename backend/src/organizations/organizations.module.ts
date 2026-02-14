import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RequireVerifiedEmailGuard } from '../auth/require-verified-email.guard';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationsController],
  providers: [RequireVerifiedEmailGuard, OrganizationsService],
})
export class OrganizationsModule {}
