import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required before PrismaService initialization');
    }

    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
