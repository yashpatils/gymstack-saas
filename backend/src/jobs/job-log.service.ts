import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobType } from './jobs.types';

type JobStatusValue = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

@Injectable()
export class JobLogService {
  constructor(private readonly prisma: PrismaService) {}

  private delegate() {
    return (this.prisma as any).jobLog;
  }

  create(type: JobType, payload: Prisma.InputJsonValue) {
    return this.delegate().create({
      data: { type, status: 'QUEUED' as JobStatusValue, payload },
    });
  }

  markProcessing(id: string, attempts: number) {
    return this.delegate().update({
      where: { id },
      data: { status: 'PROCESSING' as JobStatusValue, attempts },
    });
  }

  markCompleted(id: string) {
    return this.delegate().update({
      where: { id },
      data: { status: 'COMPLETED' as JobStatusValue, finishedAt: new Date() },
    });
  }

  markFailed(id: string, attempts: number, error: string) {
    return this.delegate().update({
      where: { id },
      data: { status: 'FAILED' as JobStatusValue, attempts, error, finishedAt: new Date() },
    });
  }

  list(page: number, pageSize: number) {
    return this.delegate().findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  count() {
    return this.delegate().count();
  }
}
