import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditActorType, ClassBookingStatus, DataExportStatus, DataExportType, MembershipRole, MembershipStatus, type PlatformBackupType } from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.types';
import { getJwtSecret } from '../common/env.util';

const EXPORT_TTL_HOURS = 24;

type RequestUser = { id?: string; userId?: string; sub?: string; activeTenantId?: string; orgId?: string };

type ExportJobRow = {
  id: string;
  type: DataExportType;
  status: DataExportStatus;
  createdAt: Date;
  expiresAt: Date | null;
};

@Injectable()
export class DataExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject('StorageService') private readonly storage: StorageService,
  ) {}

  private resolveUserId(user: RequestUser): string {
    return user.id ?? user.userId ?? user.sub ?? '';
  }

  private resolveTenantId(user: RequestUser): string {
    return user.activeTenantId ?? user.orgId ?? '';
  }

  async createExportJob(user: RequestUser, type: DataExportType) {
    const tenantId = this.resolveTenantId(user);
    const userId = this.resolveUserId(user);
    if (!tenantId || !userId) throw new ForbiddenException('Missing tenant context');

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        orgId: tenantId,
        status: MembershipStatus.ACTIVE,
        role: { in: [MembershipRole.TENANT_OWNER, MembershipRole.TENANT_LOCATION_ADMIN] },
      },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Insufficient permissions for export');

    return this.prisma.dataExportJob.create({
      data: { tenantId, requestedByUserId: userId, type, status: DataExportStatus.pending },
      select: { id: true, type: true, status: true, createdAt: true },
    });
  }

  async listExportJobs(user: RequestUser) {
    const tenantId = this.resolveTenantId(user);
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    return this.prisma.dataExportJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, status: true, createdAt: true, expiresAt: true },
    });
  }

  async getSignedDownloadUrl(user: RequestUser, id: string) {
    const tenantId = this.resolveTenantId(user);
    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    const job = await this.prisma.dataExportJob.findFirst({ where: { id, tenantId } });
    if (!job) throw new NotFoundException('Export job not found');
    if (job.status !== DataExportStatus.ready || !job.fileUrl || !job.expiresAt) {
      throw new ForbiddenException('Export file is not ready');
    }
    if (job.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException('Export file has expired');
    }

    const payload = `${job.id}:${job.expiresAt.getTime()}`;
    const token = Buffer.from(payload).toString('base64url');
    const sig = createHmac('sha256', this.getSigningSecret()).update(token).digest('hex');

    return { url: `/api/exports/files/${token}.${sig}`, expiresAt: job.expiresAt.toISOString() };
  }

  async resolveDownloadToken(tokenWithSig: string): Promise<string> {
    const [token, signature] = tokenWithSig.split('.');
    if (!token || !signature) {
      throw new ForbiddenException('Invalid download token');
    }

    const expectedSig = createHmac('sha256', this.getSigningSecret()).update(token).digest('hex');
    if (expectedSig !== signature) throw new ForbiddenException('Invalid download signature');

    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [jobId, expiresAtRaw] = decoded.split(':');
    const expiresAt = Number(expiresAtRaw);
    if (!jobId || Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      throw new ForbiddenException('Download token has expired');
    }

    const job = await this.prisma.dataExportJob.findUnique({ where: { id: jobId } });
    if (!job || job.status !== DataExportStatus.ready || !job.fileUrl || !job.expiresAt) {
      throw new NotFoundException('Export file not found');
    }
    if (job.expiresAt.getTime() !== expiresAt) {
      throw new ForbiddenException('Download token is stale');
    }

    return this.storage.getPublicUrl(job.fileUrl);
  }

  private getSigningSecret(): string {
    return process.env.DATA_EXPORT_SIGNING_SECRET ?? getJwtSecret();
  }

  async processPendingJobs(): Promise<void> {
    const candidate = await this.prisma.dataExportJob.findFirst({ where: { status: DataExportStatus.pending }, orderBy: { createdAt: 'asc' } });
    if (!candidate) return;

    const claimed = await this.prisma.dataExportJob.updateMany({
      where: { id: candidate.id, status: DataExportStatus.pending },
      data: { status: DataExportStatus.processing },
    });
    if (claimed.count === 0) return;

    try {
      const csv = await this.buildExportCsv(candidate.tenantId, candidate.type);
      const key = `exports/${candidate.tenantId}/${candidate.id}-${randomUUID()}.csv`;
      await this.storage.upload({ key, content: Buffer.from(csv, 'utf8'), contentType: 'text/csv' });
      const expiresAt = new Date(Date.now() + EXPORT_TTL_HOURS * 60 * 60 * 1000);
      await this.prisma.dataExportJob.update({ where: { id: candidate.id }, data: { status: DataExportStatus.ready, fileUrl: key, expiresAt } });
    } catch {
      await this.prisma.dataExportJob.update({ where: { id: candidate.id }, data: { status: DataExportStatus.failed } });
    }
  }

  private csvEscape(value: string | number | null): string {
    const text = value === null ? '' : String(value);
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private toCsv(headers: string[], rows: Array<Record<string, string | number | null>>): string {
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((header) => this.csvEscape(row[header] ?? null)).join(','));
    }
    return lines.join('\n');
  }

  private async buildExportCsv(tenantId: string, type: DataExportType): Promise<string> {
    if (type === DataExportType.members) {
      const data = await this.prisma.membership.findMany({
        where: { orgId: tenantId },
        include: { user: { select: { id: true, email: true, role: true, status: true, createdAt: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return this.toCsv(['membershipId', 'userId', 'email', 'role', 'status', 'tenantRole', 'joinedAt'], data.map((row) => ({
        membershipId: row.id, userId: row.userId, email: row.user.email, role: row.user.role, status: row.user.status, tenantRole: row.role, joinedAt: row.createdAt.toISOString(),
      })));
    }

    if (type === DataExportType.bookings) {
      const data = await this.prisma.classBooking.findMany({
        where: { location: { orgId: tenantId } },
        include: { user: { select: { email: true } }, session: { select: { startsAt: true, classTemplate: { select: { title: true } } } }, location: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return this.toCsv(['bookingId', 'userEmail', 'location', 'classTitle', 'startsAt', 'status', 'createdAt'], data.map((row) => ({
        bookingId: row.id, userEmail: row.user.email, location: row.location.name, classTitle: row.session.classTemplate.title, startsAt: row.session.startsAt.toISOString(), status: row.status, createdAt: row.createdAt.toISOString(),
      })));
    }

    if (type === DataExportType.classes) {
      const data = await this.prisma.class.findMany({ where: { location: { orgId: tenantId } }, include: { location: { select: { name: true } } }, orderBy: { createdAt: 'asc' } });
      return this.toCsv(['classId', 'title', 'location', 'capacity', 'active', 'createdAt'], data.map((row) => ({
        classId: row.id, title: row.title, location: row.location.name, capacity: row.capacity, active: row.isActive ? 'true' : 'false', createdAt: row.createdAt.toISOString(),
      })));
    }

    if (type === DataExportType.attendance) {
      const data = await this.prisma.classBooking.findMany({
        where: { location: { orgId: tenantId }, status: ClassBookingStatus.CHECKED_IN },
        include: { user: { select: { email: true } }, session: { select: { startsAt: true } }, location: { select: { name: true } } },
        orderBy: { updatedAt: 'asc' },
      });
      return this.toCsv(['bookingId', 'userEmail', 'location', 'checkInSessionStart', 'checkedInAt'], data.map((row) => ({
        bookingId: row.id, userEmail: row.user.email, location: row.location.name, checkInSessionStart: row.session.startsAt.toISOString(), checkedInAt: row.updatedAt.toISOString(),
      })));
    }

    const [members, bookings, classes, attendance] = await Promise.all([
      this.buildExportCsv(tenantId, DataExportType.members),
      this.buildExportCsv(tenantId, DataExportType.bookings),
      this.buildExportCsv(tenantId, DataExportType.classes),
      this.buildExportCsv(tenantId, DataExportType.attendance),
    ]);
    return `# members\n${members}\n\n# bookings\n${bookings}\n\n# classes\n${classes}\n\n# attendance\n${attendance}`;
  }

  async createTenantBackup(adminUserId: string, tenantId: string) {
    const json = await this.buildTenantSnapshot(tenantId);
    const key = `backups/${tenantId}/${randomUUID()}.json`;
    await this.storage.upload({ key, content: Buffer.from(JSON.stringify(json), 'utf8'), contentType: 'application/json' });
    return this.prisma.platformBackup.create({
      data: { tenantId, createdByAdminId: adminUserId, type: 'snapshot' as PlatformBackupType, fileUrl: key },
    });
  }

  async listBackups() {
    return this.prisma.platformBackup.findMany({ orderBy: { createdAt: 'desc' }, include: { tenant: { select: { name: true } }, createdByAdmin: { select: { email: true } } } });
  }

  private async buildTenantSnapshot(tenantId: string) {
    const [tenant, gyms, memberships, classes, sessions, bookings] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: tenantId }, select: { id: true, name: true, createdAt: true } }),
      this.prisma.gym.findMany({ where: { orgId: tenantId }, select: { id: true, name: true, slug: true, timezone: true, createdAt: true } }),
      this.prisma.membership.findMany({ where: { orgId: tenantId }, select: { id: true, userId: true, gymId: true, role: true, status: true, createdAt: true } }),
      this.prisma.class.findMany({ where: { location: { orgId: tenantId } }, select: { id: true, locationId: true, title: true, capacity: true, isActive: true, createdAt: true } }),
      this.prisma.classSession.findMany({ where: { location: { orgId: tenantId } }, select: { id: true, classId: true, locationId: true, startsAt: true, endsAt: true, status: true, createdAt: true } }),
      this.prisma.classBooking.findMany({ where: { location: { orgId: tenantId } }, select: { id: true, sessionId: true, locationId: true, userId: true, status: true, createdAt: true } }),
    ]);
    return { tenant, exportedAt: new Date().toISOString(), gyms, memberships, classes, sessions, bookings };
  }

  async restorePreview(backupId: string) {
    const backup = await this.prisma.platformBackup.findUnique({ where: { id: backupId } });
    if (!backup) throw new NotFoundException('Backup not found');

    return { backupId, tenantId: backup.tenantId, fileUrl: backup.fileUrl, summary: 'Dry run only. v1 restore support validates backup identity and tenant mapping without mutating data.' };
  }

  async restoreApply(adminUserId: string, backupId: string, confirmed: boolean) {
    if (!confirmed) throw new ForbiddenException('Restore confirmation is required');
    const backup = await this.prisma.platformBackup.findUnique({ where: { id: backupId } });
    if (!backup) throw new NotFoundException('Backup not found');

    await this.audit.log({
      actor: { type: AuditActorType.ADMIN, userId: adminUserId },
      tenantId: backup.tenantId,
      action: 'admin.backup.restore.apply',
      targetType: 'platform_backup',
      targetId: backup.id,
      metadata: { backupId: backup.id, mode: 'safety-noop-v1' },
    });

    return { backupId: backup.id, status: 'accepted', detail: 'Restore confirmation accepted. v1 keeps restore in safety no-op mode.' };
  }
}
