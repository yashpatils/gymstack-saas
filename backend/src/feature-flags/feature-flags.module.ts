import { Module } from '@nestjs/common';
import { RequirePlatformAdminGuard } from '../admin/require-platform-admin.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, RequirePlatformAdminGuard],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
