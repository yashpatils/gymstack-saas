import { MembershipRole, MembershipStatus, PlanKey, PrismaClient, Role, SubscriptionStatus, UserStatus } from '@prisma/client';
import { hashPassword } from '../src/auth/password-hasher.ts';

const prisma = new PrismaClient();

const DEFAULT_QA_EMAIL = 'qa+admin@gymstack.club';
const DEFAULT_QA_PASSWORD = 'TestPassword123!';
const DEFAULT_QA_BYPASS = true;
const DEFAULT_QA_ROLE: Role = Role.ADMIN;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function resolveRole(input?: string): Role {
  if (!input) return DEFAULT_QA_ROLE;
  const normalized = input.trim().toUpperCase();
  if (!Object.values(Role).includes(normalized as Role)) {
    throw new Error(`QA_ROLE must be one of: ${Object.values(Role).join(', ')}`);
  }
  return normalized as Role;
}

function ensureEnabled(): void {
  if (process.env.ENABLE_QA_USER_SEED !== 'true') {
    throw new Error('Refusing to run. Set ENABLE_QA_USER_SEED=true to continue.');
  }
}

async function ensureQaUser(): Promise<void> {
  ensureEnabled();

  const email = (process.env.QA_EMAIL ?? DEFAULT_QA_EMAIL).trim().toLowerCase();
  const password = process.env.QA_PASSWORD ?? DEFAULT_QA_PASSWORD;
  const qaBypass = parseBoolean(process.env.QA_BYPASS, DEFAULT_QA_BYPASS);
  const role = resolveRole(process.env.QA_ROLE);

  if (!email || !password) {
    throw new Error('QA_EMAIL and QA_PASSWORD must be non-empty.');
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    let user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        password: passwordHash,
        role,
        qaBypass,
        emailVerifiedAt: now,
        status: UserStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.TRIAL,
      },
      update: {
        password: passwordHash,
        role,
        qaBypass,
        emailVerifiedAt: now,
        status: UserStatus.ACTIVE,
      },
    });

    let organizationId = user.orgId;

    if (!organizationId) {
      const existingMembership = await tx.membership.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      if (existingMembership) {
        organizationId = existingMembership.orgId;
      } else {
        const organization = await tx.organization.create({
          data: {
            name: 'QA Admin Tenant',
            planKey: PlanKey.starter,
            subscriptionStatus: SubscriptionStatus.TRIAL,
          },
        });
        organizationId = organization.id;

        await tx.membership.create({
          data: {
            orgId: organization.id,
            userId: user.id,
            role: MembershipRole.TENANT_OWNER,
            status: MembershipStatus.ACTIVE,
          },
        });
      }

      user = await tx.user.update({
        where: { id: user.id },
        data: { orgId: organizationId },
      });
    }

    const ownerMembership = await tx.membership.findFirst({
      where: {
        userId: user.id,
        orgId: organizationId,
        role: MembershipRole.TENANT_OWNER,
      },
    });

    if (!ownerMembership && organizationId) {
      await tx.membership.create({
        data: {
          orgId: organizationId,
          userId: user.id,
          role: MembershipRole.TENANT_OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });
    } else if (ownerMembership && ownerMembership.status !== MembershipStatus.ACTIVE) {
      await tx.membership.update({
        where: { id: ownerMembership.id },
        data: { status: MembershipStatus.ACTIVE },
      });
    }

    return { userId: user.id, organizationId };
  });

  console.log(`QA user ensured for ${email} (userId=${result.userId}, orgId=${result.organizationId ?? 'none'})`);
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
