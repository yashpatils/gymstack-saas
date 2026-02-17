import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { EmailQueueService } from '../email/email-queue.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly emailService: EmailService,
  ) {}

  async createTicket(input: CreateSupportTicketDto, userId?: string): Promise<{ ok: true; ticketId: string }> {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: userId ?? null,
        email: input.email,
        subject: input.subject,
        message: input.message,
      },
    });

    this.emailQueue.enqueue('support_ticket_created', async () => {
      await this.emailService.sendTemplatedActionEmail({
        to: 'support@gymstack.club',
        template: 'support_ticket_created',
        subject: `New support ticket: ${ticket.subject}`,
        title: 'New support ticket',
        intro: `${ticket.email} submitted a support request: ${ticket.message}`,
        buttonLabel: 'Open support queue',
        link: `${process.env.APP_URL ?? 'https://gymstack.club'}/platform/support`,
      });
    });

    return { ok: true, ticketId: ticket.id };
  }
}
