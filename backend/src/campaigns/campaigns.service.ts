import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CampaignRecipientStatus,
  CampaignSegmentType,
  MembershipRole,
  MembershipStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../users/user.model';
import { EmailService } from '../email/email.service';
import { EmailQueueService } from '../email/email-queue.service';
import { GenerateCampaignDto, SendCampaignDto } from './dto/campaign.dto';

type CampaignAudienceMember = {
  memberId: string;
  firstName: string;
  email: string;
};

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  private resolveTenantId(user: User): string {
    const tenantId = user.supportMode?.tenantId ?? user.activeTenantId ?? user.orgId;
    if (!tenantId) {
      throw new ForbiddenException('No tenant context selected');
    }
    return tenantId;
  }

  private async assertOwner(user: User, tenantId: string): Promise<void> {
    if (user.isPlatformAdmin) {
      return;
    }

    const ownerMembership = await this.prisma.membership.findFirst({
      where: {
        orgId: tenantId,
        userId: user.id,
        role: MembershipRole.TENANT_OWNER,
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!ownerMembership) {
      throw new ForbiddenException('Only tenant owners can create campaigns');
    }
  }

  private async getAudience(
    tenantId: string,
    segmentType: CampaignSegmentType,
    inactivityDays = 14,
  ): Promise<CampaignAudienceMember[]> {
    if (segmentType === CampaignSegmentType.INACTIVE_MEMBERS) {
      return this.getInactiveMembers(tenantId, inactivityDays);
    }
    if (segmentType === CampaignSegmentType.EXPIRING_MEMBERSHIPS) {
      return this.getExpiringMemberships(tenantId);
    }
    return this.getLowAttendanceMembers(tenantId);
  }

  private async getClientBase(tenantId: string): Promise<CampaignAudienceMember[]> {
    const members = await this.prisma.membership.findMany({
      where: {
        orgId: tenantId,
        role: MembershipRole.CLIENT,
        status: MembershipStatus.ACTIVE,
      },
      select: {
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      distinct: ['userId'],
    });

    return members
      .map((member) => ({
        memberId: member.userId,
        firstName: member.user.email.split('@')[0] ?? 'Member',
        email: member.user.email,
      }))
      .filter((member) => member.email.length > 0);
  }

  private async getInactiveMembers(
    tenantId: string,
    inactivityDays: number,
  ): Promise<CampaignAudienceMember[]> {
    const base = await this.getClientBase(tenantId);
    const since = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);

    const recentCheckins = await this.prisma.classBooking.findMany({
      where: {
        location: { orgId: tenantId },
        status: 'CHECKED_IN',
        updatedAt: { gte: since },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    const activeSet = new Set(recentCheckins.map((item) => item.userId));
    return base.filter((member) => !activeSet.has(member.memberId));
  }

  private async getExpiringMemberships(tenantId: string): Promise<CampaignAudienceMember[]> {
    const now = new Date();
    const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.clientMembership.findMany({
      where: {
        location: { orgId: tenantId },
        status: { in: ['active', 'trialing'] },
        endAt: { gte: now, lte: inSevenDays },
      },
      select: {
        userId: true,
        user: { select: { email: true } },
      },
      distinct: ['userId'],
    });

    return rows.map((item) => ({
      memberId: item.userId,
      firstName: item.user.email.split('@')[0] ?? 'Member',
      email: item.user.email,
    }));
  }

  private async getLowAttendanceMembers(tenantId: string): Promise<CampaignAudienceMember[]> {
    const now = Date.now();
    const periodDays = 14;
    const currentStart = new Date(now - periodDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now - periodDays * 2 * 24 * 60 * 60 * 1000);

    const [current, previous] = await Promise.all([
      this.prisma.classBooking.groupBy({
        by: ['userId'],
        where: {
          location: { orgId: tenantId },
          status: 'CHECKED_IN',
          updatedAt: { gte: currentStart },
        },
        _count: { _all: true },
      }),
      this.prisma.classBooking.groupBy({
        by: ['userId'],
        where: {
          location: { orgId: tenantId },
          status: 'CHECKED_IN',
          updatedAt: { gte: previousStart, lt: currentStart },
        },
        _count: { _all: true },
      }),
    ]);

    const currentMap = new Map(current.map((row) => [row.userId, row._count._all]));
    const candidates = previous
      .filter((row) => row._count._all > 0)
      .filter((row) => {
        const currentCount = currentMap.get(row.userId) ?? 0;
        return currentCount < row._count._all / 2;
      })
      .map((row) => row.userId);

    if (candidates.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: candidates } },
      select: { id: true, email: true },
    });

    return users.map((item) => ({
      memberId: item.id,
      firstName: item.email.split('@')[0] ?? 'Member',
      email: item.email,
    }));
  }

  private async generateMessage(
    segmentType: CampaignSegmentType,
    memberCount: number,
    gymName: string,
  ): Promise<{ subject: string; body: string }> {
    const fallback = {
      subject: `${gymName}: We miss you at the gym`,
      body: `Hi there,\n\nWe noticed you have been less active recently. We would love to see you back at ${gymName}. Reply to this email if you want help picking the right plan or class this week.\n\nYou've got this 💪\n${gymName} Team`,
    };

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return fallback;
    }

    const promptInput = {
      segmentType,
      memberCount,
      gymName,
      tone: 'friendly and motivating',
    };

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Generate concise gym reactivation campaign copy in JSON with keys subject and body. Do not include placeholders for personal data.',
            },
            {
              role: 'user',
              content: JSON.stringify(promptInput),
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return fallback;
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = payload.choices?.[0]?.message?.content;
      if (!text) {
        return fallback;
      }
      const parsed = JSON.parse(text) as { subject?: string; body?: string };
      if (!parsed.subject || !parsed.body) {
        return fallback;
      }
      return { subject: parsed.subject, body: parsed.body };
    } catch {
      return fallback;
    }
  }

  async generateDraft(user: User, dto: GenerateCampaignDto) {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwner(user, tenantId);

    const audience = await this.getAudience(tenantId, dto.segmentType, dto.inactivityDays ?? 14);
    const tenant = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const draft = await this.generateMessage(dto.segmentType, audience.length, tenant?.name ?? 'Your gym');

    return this.prisma.campaign.create({
      data: {
        tenantId,
        segmentType: dto.segmentType,
        subject: draft.subject,
        body: draft.body,
        createdByUserId: user.id,
        recipientCount: audience.length,
      },
      select: {
        id: true,
        segmentType: true,
        subject: true,
        body: true,
        recipientCount: true,
        createdAt: true,
      },
    });
  }

  async sendCampaign(user: User, dto: SendCampaignDto) {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwner(user, tenantId);

    const duplicateCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const duplicate = await this.prisma.campaign.findFirst({
      where: {
        tenantId,
        segmentType: dto.segmentType,
        sentAt: { gte: duplicateCutoff },
      },
      select: { id: true, sentAt: true },
      orderBy: { sentAt: 'desc' },
    });

    if (duplicate) {
      throw new BadRequestException('A campaign for this segment was already sent in the last 24 hours');
    }

    const audience = await this.getAudience(tenantId, dto.segmentType, dto.inactivityDays ?? 14);
    if (audience.length === 0) {
      throw new BadRequestException('No recipients found for selected segment');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId,
        segmentType: dto.segmentType,
        subject: dto.subject,
        body: dto.body,
        recipientCount: audience.length,
        sentAt: new Date(),
        createdByUserId: user.id,
      },
    });

    await this.prisma.campaignRecipient.createMany({
      data: audience.map((member) => ({
        campaignId: campaign.id,
        memberId: member.memberId,
        email: member.email,
        firstName: member.firstName,
      })),
    });

    this.emailQueueService.enqueue(`campaign:${campaign.id}`, async () => {
      const recipients = await this.prisma.campaignRecipient.findMany({
        where: {
          campaignId: campaign.id,
          status: { in: [CampaignRecipientStatus.PENDING, CampaignRecipientStatus.FAILED] },
          attempts: { lt: 3 },
        },
      });

      for (const recipient of recipients) {
        try {
          await this.emailService.sendEmail({
            to: recipient.email,
            subject: campaign.subject,
            html: `<p>Hi ${recipient.firstName || 'there'},</p><p>${campaign.body.replace(/\n/g, '<br/>')}</p>`,
            text: `Hi ${recipient.firstName || 'there'},\n\n${campaign.body}`,
            template: 'reactivation_campaign',
            tags: [
              { name: 'campaignId', value: campaign.id },
              { name: 'segmentType', value: campaign.segmentType },
            ],
          });

          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: CampaignRecipientStatus.SENT,
              sentAt: new Date(),
              attempts: { increment: 1 },
              lastError: null,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to send';
          this.logger.error(`Campaign recipient send failed ${recipient.id}: ${message}`);
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: CampaignRecipientStatus.FAILED,
              attempts: { increment: 1 },
              lastError: message.slice(0, 500),
            },
          });
        }
      }
    });

    return { campaignId: campaign.id, recipientCount: campaign.recipientCount, status: 'queued' };
  }

  async listCampaigns(user: User) {
    const tenantId = this.resolveTenantId(user);
    await this.assertOwner(user, tenantId);

    return this.prisma.campaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        segmentType: true,
        subject: true,
        recipientCount: true,
        sentAt: true,
        createdAt: true,
      },
      take: 100,
    });
  }
}
