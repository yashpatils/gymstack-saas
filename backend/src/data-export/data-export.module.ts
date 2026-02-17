import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { DataExportController } from './data-export.controller';
import { DataExportService } from './data-export.service';
import { DataExportProcessor } from './data-export.processor';

@Module({
  imports: [PrismaModule, AuditModule, StorageModule],
  controllers: [DataExportController],
  providers: [DataExportService, DataExportProcessor],
  exports: [DataExportService],
})
export class DataExportModule {}
