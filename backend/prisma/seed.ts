const bcrypt = require('bcrypt');
const { PrismaClient, MembershipRole, MembershipStatus, Role, SubscriptionStatus, UserStatus, BillingProvider } = require('@prisma/client');

const prisma = new PrismaClient();

async function ensureMembership(userId: string, orgId: string, role: string, gymId?: string | null) {
  return prisma.membership.upsert({
    where: {
      userId_orgId_gymId_role: {
        userId,
        orgId,
        gymId: gymId ?? null,
        role,
      },
    },
    update: { status: MembershipStatus.ACTIVE },
    create: {
      userId,
      orgId,
      gymId: gymId ?? null,
      role,
      status: MembershipStatus.ACTIVE,
    },
  });
}

async function main() {
  const ownerEmail = process.env.DEMO_EMAIL ?? 'owner@gymstack.dev';
  const ownerPassword = process.env.DEMO_PASSWORD ?? 'demo12345';
  const tenantName = process.env.DEMO_TENANT_NAME ?? 'GymStack Demo Tenant';
  const gymName = process.env.DEMO_GYM_NAME ?? 'Downtown Demo Gym';

  const ownerPasswordHash = await bcrypt.hash(ownerPassword, 10);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      password: ownerPasswordHash,
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: ownerEmail,
      password: ownerPasswordHash,
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const tenant = await prisma.organization.upsert({
    where: { id: `seed-${owner.id}` },
    update: { name: tenantName },
    create: {
      id: `seed-${owner.id}`,
      name: tenantName,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      billingProvider: BillingProvider.STRIPE,
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await ensureMembership(owner.id, tenant.id, MembershipRole.TENANT_OWNER);
  await prisma.user.update({ where: { id: owner.id }, data: { orgId: tenant.id } });

  const gym = await prisma.gym.upsert({
    where: { id: `seed-gym-${owner.id}` },
    update: { name: gymName, orgId: tenant.id, ownerId: owner.id },
    create: { id: `seed-gym-${owner.id}`, name: gymName, orgId: tenant.id, ownerId: owner.id },
  });

  await ensureMembership(owner.id, tenant.id, MembershipRole.TENANT_LOCATION_ADMIN, gym.id);

  const qaEmail = 'qa+admin@gymstack.club';
  const qaPassword = 'TestPassword123!';
  const qaPasswordHash = await bcrypt.hash(qaPassword, 10);

  const qaTenant = await prisma.organization.upsert({
    where: { id: 'seed-qa-tenant' },
    update: { name: 'GymStack QA Tenant' },
    create: {
      id: 'seed-qa-tenant',
      name: 'GymStack QA Tenant',
      subscriptionStatus: SubscriptionStatus.FREE,
      billingProvider: BillingProvider.STRIPE,
    },
  });

  const qaUser = await prisma.user.upsert({
    where: { email: qaEmail },
    update: {
      password: qaPasswordHash,
      role: Role.ADMIN,
      orgId: qaTenant.id,
      qaBypass: true,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: qaEmail,
      password: qaPasswordHash,
      role: Role.ADMIN,
      orgId: qaTenant.id,
      qaBypass: true,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const qaGym = await prisma.gym.upsert({
    where: { id: 'seed-qa-gym' },
    update: { name: 'GymStack QA Location', orgId: qaTenant.id, ownerId: qaUser.id },
    create: { id: 'seed-qa-gym', name: 'GymStack QA Location', orgId: qaTenant.id, ownerId: qaUser.id },
  });

  await ensureMembership(qaUser.id, qaTenant.id, MembershipRole.TENANT_OWNER);
  await ensureMembership(qaUser.id, qaTenant.id, MembershipRole.TENANT_LOCATION_ADMIN, qaGym.id);

  console.log(`Seed complete. Owner: ${ownerEmail} / ${ownerPassword}`);
  console.log(`QA User: ${qaEmail} / ${qaPassword}`);
  console.log(`QA Tenant: ${qaTenant.name} (${qaTenant.id})`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
