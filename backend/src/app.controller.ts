import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

type HealthPayload = {
  ok: boolean;
  status: string;
  uptimeSeconds: number;
  version: string;
  database: {
    connected: boolean;
  };
  timestamp: string;
};

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getRoot(): { ok: true; service: string } {
    return { ok: true, service: 'gymstack-backend' };
  }

  @Get('health')
  async getHealth(): Promise<HealthPayload> {
    let databaseConnected = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseConnected = false;
    }

    return {
      ok: databaseConnected,
      status: databaseConnected ? 'ok' : 'degraded',
      uptimeSeconds: process.uptime(),
      version: process.env.APP_VERSION ?? process.env.npm_package_version ?? 'dev',
      database: {
        connected: databaseConnected,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/health')
  async getApiHealth(): Promise<HealthPayload> {
    return this.getHealth();
  }

  @Get('db/ping')
  async getDatabasePing(): Promise<{ ok: true }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  }
}
