import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  enqueue(taskName: string, task: () => Promise<void>): void {
    setImmediate(() => {
      void task().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown email queue error';
        this.logger.error(`Email queue task failed: ${taskName} - ${message}`);
      });
    });
  }
}
