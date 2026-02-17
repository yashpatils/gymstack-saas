import { Injectable } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobType } from './jobs.types';

@Injectable()
export class JobLogService {
  constructor(private readonly prisma: PrismaService) {}

  create(type: JobType, payload: Prisma.InputJsonValue) {
    return this.prisma.jobLog.create({
      data: { type, status: JobStatus.QUEUED, payload },
    });
  }

  markProcessing(id: string, attempts: number) {
    return this.prisma.jobLog.update({
      where: { id },
      data: { status: JobStatus.PROCESSING, attempts },
    });
  }

  markCompleted(id: string) {
    return this.prisma.jobLog.update({
      where: { id },
      data: { status: JobStatus.COMPLETED, finishedAt: new Date() },
    });
  }

  markFailed(id: string, attempts: number, error: string) {
    return this.prisma.jobLog.update({
      where: { id },
      data: { status: JobStatus.FAILED, attempts, error, finishedAt: new Date() },
    });
  }

  list(page: number, pageSize: number) {
    return this.prisma.jobLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  count() {
    return this.prisma.jobLog.count();
  }
}
