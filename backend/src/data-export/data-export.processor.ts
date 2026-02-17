import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataExportService } from './data-export.service';

@Injectable()
export class DataExportProcessor implements OnModuleInit {
  private readonly logger = new Logger(DataExportProcessor.name);

  constructor(private readonly dataExportService: DataExportService) {}

  onModuleInit(): void {
    setInterval(() => {
      void this.tick();
    }, 1500);
  }

  private async tick(): Promise<void> {
    try {
      await this.dataExportService.processPendingJobs();
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
    }
  }
}
