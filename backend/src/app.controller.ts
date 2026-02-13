import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getRoot(): { ok: true } {
    return { ok: true };
  }

  @Get('health')
  getHealth(): { ok: true } {
    return { ok: true };
  }

  @Get('api/health')
  getApiHealth(): { ok: true } {
    return this.getHealth();
  }

  @Get('db/ping')
  async getDatabasePing(): Promise<{ ok: true }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  }
}
