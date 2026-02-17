import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { JobLogService } from './job-log.service';
import { JobEnvelope, JobPayloadMap, JobType } from './jobs.types';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);
  private readonly queue: Array<JobEnvelope<JobType>> = [];
  private processing = false;

  constructor(
    private readonly jobLogService: JobLogService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit(): void {
    setInterval(() => {
      void this.drainQueue();
    }, 500);
  }

  async enqueue<T extends JobType>(type: T, payload: JobPayloadMap[T]): Promise<string> {
    const log = await this.jobLogService.create(type, payload as Prisma.InputJsonValue);
    this.queue.push({ id: log.id, type, payload, attempts: 0, maxAttempts: 3 });
    return log.id;
  }

  private async drainQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift();
        if (!job) {
          break;
        }

        job.attempts += 1;
        await this.jobLogService.markProcessing(job.id, job.attempts);
        try {
          await this.handleJob(job);
          await this.jobLogService.markCompleted(job.id);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`Job ${job.id} failed: ${message}`);
          if (job.attempts < job.maxAttempts) {
            this.queue.push(job);
          } else {
            await this.jobLogService.markFailed(job.id, job.attempts, message);
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async handleJob(job: JobEnvelope<JobType>): Promise<void> {
    switch (job.type) {
      case 'email': {
        const payload = job.payload as JobPayloadMap['email'];
        if (payload.action === 'location-invite') {
          await this.emailService.sendLocationInvite(payload.to, payload.inviteUrl);
        }
        return;
      }
      case 'webhook': {
        const payload = job.payload as JobPayloadMap['webhook'];
        this.logger.log(`Webhook job queued for ${payload.endpoint}`);
        return;
      }
      case 'insight': {
        const payload = job.payload as JobPayloadMap['insight'];
        this.logger.log(`Insight job queued for tenant ${payload.tenantId}`);
        return;
      }
      case 'class-reminder': {
        const payload = job.payload as JobPayloadMap['class-reminder'];
        this.logger.log(`Class reminder queued for session ${payload.sessionId}`);
        return;
      }
      default: {
        const payload = job.payload as JobPayloadMap['data-export'];
        this.logger.log(`Data export queued for tenant ${payload.tenantId}`);
      }
    }
  }
}
