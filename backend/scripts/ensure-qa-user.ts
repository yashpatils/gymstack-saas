import { MembershipRole, MembershipStatus, PlanKey, PrismaClient, Role, SubscriptionStatus, UserStatus } from '@prisma/client';
import { hashPassword } from '../src/auth/password-hasher';

const prisma = new PrismaClient();

const DEFAULT_QA_EMAIL = 'qa+admin@gymstack.club';
const DEFAULT_QA_PASSWORD = 'TestPassword123!';

function ensureSeedEnabled(): void {
  if (process.env.ENABLE_QA_USER_SEED !== 'true') {
    throw new Error('Refusing to run. Set ENABLE_QA_USER_SEED=true to continue.');
  }
}

function makeSlug(base: string): string {
  const normalized = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalized) {
    return `qa-${Date.now().toString(36)}`;
  }

  return `${normalized}-${Date.now().toString(36)}`;
}

async function ensureQaUser(): Promise<void> {
  ensureSeedEnabled();

  const email = (process.env.QA_EMAIL ?? DEFAULT_QA_EMAIL).trim().toLowerCase();
  const password = process.env.QA_PASSWORD ?? DEFAULT_QA_PASSWORD;

  if (!email || !password) {
    throw new Error('QA_EMAIL and QA_PASSWORD must be non-empty.');
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        password: passwordHash,
        role: Role.ADMIN,
        qaBypass: true,
        emailVerifiedAt: now,
        status: UserStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.TRIAL,
      },
      update: {
        password: passwordHash,
        role: Role.ADMIN,
        qaBypass: true,
        emailVerifiedAt: now,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        orgId: true,
      },
    });

    const existingMembership = await tx.membership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { orgId: true },
    });

    let orgId = user.orgId ?? existingMembership?.orgId;

    if (!orgId) {
      const createdOrg = await tx.organization.create({
        data: {
          name: 'QA Workspace',
          planKey: PlanKey.starter,
          subscriptionStatus: SubscriptionStatus.TRIAL,
        },
        select: { id: true },
      });
      orgId = createdOrg.id;
    }

    await tx.user.update({
      where: { id: user.id },
      data: { orgId },
    });

    const ownerMembership = await tx.membership.findFirst({
      where: {
        orgId,
        userId: user.id,
        gymId: null,
        role: MembershipRole.TENANT_OWNER,
      },
      select: { id: true, status: true },
    });

    if (!ownerMembership) {
      await tx.membership.create({
        data: {
          orgId,
          userId: user.id,
          role: MembershipRole.TENANT_OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });
    } else if (ownerMembership.status !== MembershipStatus.ACTIVE) {
      await tx.membership.update({
        where: { id: ownerMembership.id },
        data: { status: MembershipStatus.ACTIVE },
      });
    }

    let gym = await tx.gym.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!gym) {
      gym = await tx.gym.create({
        data: {
          name: 'QA Location',
          slug: makeSlug('qa-location'),
          ownerId: user.id,
          orgId,
        },
        select: { id: true },
      });
    }

    const managerMembership = await tx.membership.findFirst({
      where: {
        orgId,
        userId: user.id,
        gymId: gym.id,
        role: MembershipRole.TENANT_LOCATION_ADMIN,
      },
      select: { id: true, status: true },
    });

    if (!managerMembership) {
      await tx.membership.create({
        data: {
          orgId,
          userId: user.id,
          gymId: gym.id,
          role: MembershipRole.TENANT_LOCATION_ADMIN,
          status: MembershipStatus.ACTIVE,
        },
      });
    } else if (managerMembership.status !== MembershipStatus.ACTIVE) {
      await tx.membership.update({
        where: { id: managerMembership.id },
        data: { status: MembershipStatus.ACTIVE },
      });
    }

    return { userId: user.id, orgId, gymId: gym.id };
  });

  console.log(`QA user ensured for ${email} (userId=${result.userId}, orgId=${result.orgId}, gymId=${result.gymId})`);
}

ensureQaUser()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to ensure QA user: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
