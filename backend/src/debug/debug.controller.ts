import { Controller, Get } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { getRegisteredRoutes } from './route-list.util';

@Controller('debug')
export class DebugController {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  @Get('routes')
  getRoutes(): string[] {
    const server = this.httpAdapterHost.httpAdapter.getHttpServer();
    return getRegisteredRoutes(server);
  }
}
