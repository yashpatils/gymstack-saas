import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ChangelogAudience, FeedbackCategory, FeedbackPriority, FeedbackStatus, MembershipRole, MembershipStatus, ReleaseBuildStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { CreateChangelogEntryDto } from './dto/create-changelog-entry.dto';
import { UpdateReleaseStatusDto } from './dto/update-release-status.dto';

type AuthenticatedUser = {
  id: string;
  activeTenantId?: string;
  activeRole?: MembershipRole;
  isPlatformAdmin?: boolean;
};

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async createFeedback(user: AuthenticatedUser, input: CreateFeedbackDto) {
    const tenantId = user.activeTenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        orgId: tenantId,
        userId: user.id,
        status: MembershipStatus.ACTIVE,
        role: { in: [MembershipRole.TENANT_OWNER, MembershipRole.TENANT_LOCATION_ADMIN, MembershipRole.GYM_STAFF_COACH] },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('Only tenant owner and staff can submit feedback');
    }

    return this.prisma.feedback.create({
      data: {
        tenantId,
        userId: user.id,
        message: input.message.trim(),
        page: input.page.trim(),
        priority: input.priority,
        taskId: input.taskId?.trim() || null,
      },
    });
  }

  async listFeedback(filters: { tenantId?: string; status?: FeedbackStatus; priority?: FeedbackPriority }) {
    return this.prisma.feedback.findMany({
      where: {
        tenantId: filters.tenantId,
        status: filters.status,
        priority: filters.priority,
      },
      include: {
        tenant: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateFeedback(id: string, input: UpdateFeedbackDto) {
    const taskId = input.taskId?.trim();
    return this.prisma.feedback.update({
      where: { id },
      data: {
        status: input.status,
        category: input.category as FeedbackCategory | undefined,
        taskId: taskId === undefined ? undefined : taskId || null,
      },
    });
  }

  listChangelogAdmin() {
    return this.prisma.changelogEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createChangelogEntry(input: CreateChangelogEntryDto) {
    return this.prisma.changelogEntry.create({
      data: {
        title: input.title.trim(),
        description: input.description.trim(),
        audience: input.audience,
      },
    });
  }

  async listChangelogForUser(user: AuthenticatedUser) {
    const audiences = this.resolveAudiences(user);
    return this.prisma.changelogEntry.findMany({
      where: { audience: { in: audiences } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getReleaseStatus() {
    const latest = await this.prisma.releaseStatus.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (latest) {
      return latest;
    }

    return {
      id: 'default',
      version: process.env.RELEASE_VERSION ?? '0.0.0-dev',
      lastDeployAt: new Date(0),
      buildStatus: ReleaseBuildStatus.unknown,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  }

  async updateReleaseStatus(input: UpdateReleaseStatusDto) {
    return this.prisma.releaseStatus.create({
      data: {
        version: input.version.trim(),
        lastDeployAt: new Date(input.lastDeployAt),
        buildStatus: input.buildStatus ?? ReleaseBuildStatus.unknown,
      },
    });
  }

  private resolveAudiences(user: AuthenticatedUser): ChangelogAudience[] {
    if (user.isPlatformAdmin) {
      return [ChangelogAudience.admin, ChangelogAudience.tenant, ChangelogAudience.staff];
    }

    if (user.activeRole === MembershipRole.GYM_STAFF_COACH) {
      return [ChangelogAudience.staff];
    }

    if (user.activeRole === MembershipRole.CLIENT) {
      return [ChangelogAudience.client];
    }

    return [ChangelogAudience.tenant, ChangelogAudience.staff];
  }
}
