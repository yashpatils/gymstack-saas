import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminService, RequirePlatformAdminGuard],
})
export class AdminModule {}
