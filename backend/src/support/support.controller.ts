import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('ticket')
  async createTicket(@Body() input: CreateSupportTicketDto, @Req() request: Request): Promise<{ ok: true; ticketId: string }> {
    const userId = typeof request.user === 'object' && request.user && 'sub' in request.user
      ? String(request.user.sub)
      : undefined;
    return this.supportService.createTicket(input, userId);
  }
}
