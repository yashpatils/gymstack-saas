import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CHUNK_SIZE = 500;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class OtpCleanupService implements OnModuleInit {
  private readonly logger = new Logger(OtpCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    setInterval(() => {
      void this.cleanupOtpArtifacts();
    }, 60 * 60 * 1000);
  }

  async cleanupOtpArtifacts(now = new Date()): Promise<void> {
    const consumedOlderThan = new Date(now.getTime() - 7 * ONE_DAY_MS);
    const expiredUnusedOlderThan = new Date(now.getTime() - 2 * ONE_DAY_MS);

    await this.deletePendingSensitiveChanges(consumedOlderThan, expiredUnusedOlderThan);
    await this.deleteLoginOtpChallenges(consumedOlderThan, expiredUnusedOlderThan);
  }

  private async deletePendingSensitiveChanges(consumedOlderThan: Date, expiredUnusedOlderThan: Date): Promise<void> {
    while (true) {
      const rows = await this.prisma.pendingSensitiveChange.findMany({
        where: {
          OR: [
            { consumedAt: { lt: consumedOlderThan } },
            { cancelledAt: { lt: consumedOlderThan } },
            {
              consumedAt: null,
              cancelledAt: null,
              otpExpiresAt: { lt: expiredUnusedOlderThan },
            },
          ],
        },
        select: { id: true },
        take: CHUNK_SIZE,
        orderBy: { createdAt: 'asc' },
      });

      if (!rows.length) {
        break;
      }

      const deleted = await this.prisma.pendingSensitiveChange.deleteMany({
        where: { id: { in: rows.map((row) => row.id) } },
      });

      this.logger.log(`Deleted ${deleted.count} pending sensitive OTP artifacts`);

      if (rows.length < CHUNK_SIZE) {
        break;
      }
    }
  }

  private async deleteLoginOtpChallenges(consumedOlderThan: Date, expiredUnusedOlderThan: Date): Promise<void> {
    while (true) {
      const rows = await this.prisma.loginOtpChallenge.findMany({
        where: {
          OR: [
            { consumedAt: { lt: consumedOlderThan } },
            {
              consumedAt: null,
              otpExpiresAt: { lt: expiredUnusedOlderThan },
            },
          ],
        },
        select: { id: true },
        take: CHUNK_SIZE,
        orderBy: { createdAt: 'asc' },
      });

      if (!rows.length) {
        break;
      }

      const deleted = await this.prisma.loginOtpChallenge.deleteMany({
        where: { id: { in: rows.map((row) => row.id) } },
      });

      this.logger.log(`Deleted ${deleted.count} login OTP challenge artifacts`);

      if (rows.length < CHUNK_SIZE) {
        break;
      }
    }
  }
}
