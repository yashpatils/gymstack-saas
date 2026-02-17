import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DemoService } from './demo.service';

@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get('access')
  access() { return this.demoService.accessDemo(); }

  @UseGuards(JwtAuthGuard)
  @Post('reset')
  reset(@Req() req: { user: { id: string; activeTenantId?: string } }) {
    return this.demoService.resetDemoData(req.user.id, req.user.activeTenantId);
  }
}
