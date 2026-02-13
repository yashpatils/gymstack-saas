const bcrypt = require('bcrypt');
const { PrismaClient, Role, MembershipRole, MembershipStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.DEMO_EMAIL ?? 'owner@gymstack.dev';
  const ownerPassword = process.env.DEMO_PASSWORD ?? 'demo12345';
  const tenantName = process.env.DEMO_TENANT_NAME ?? 'GymStack Demo Tenant';
  const gymName = process.env.DEMO_GYM_NAME ?? 'Downtown Demo Gym';

  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      password: passwordHash,
      role: Role.OWNER,
    },
    create: {
      email: ownerEmail,
      password: passwordHash,
      role: Role.OWNER,
    },
  });

  const tenant = await prisma.organization.upsert({
    where: { id: `seed-${owner.id}` },
    update: { name: tenantName },
    create: { id: `seed-${owner.id}`, name: tenantName },
  });

  await prisma.membership.upsert({
    where: {
      userId_orgId_gymId_role: {
        userId: owner.id,
        orgId: tenant.id,
        gymId: null,
        role: MembershipRole.tenant_owner,
      },
    },
    update: { status: MembershipStatus.ACTIVE },
    create: {
      userId: owner.id,
      orgId: tenant.id,
      role: MembershipRole.tenant_owner,
      status: MembershipStatus.ACTIVE,
    },
  });

  await prisma.user.update({ where: { id: owner.id }, data: { orgId: tenant.id } });

  const gym = await prisma.gym.upsert({
    where: { id: `seed-gym-${owner.id}` },
    update: { name: gymName, orgId: tenant.id, ownerId: owner.id },
    create: { id: `seed-gym-${owner.id}`, name: gymName, orgId: tenant.id, ownerId: owner.id },
  });

  await prisma.membership.upsert({
    where: {
      userId_orgId_gymId_role: {
        userId: owner.id,
        orgId: tenant.id,
        gymId: gym.id,
        role: MembershipRole.gym_owner,
      },
    },
    update: { status: MembershipStatus.ACTIVE },
    create: {
      userId: owner.id,
      orgId: tenant.id,
      gymId: gym.id,
      role: MembershipRole.gym_owner,
      status: MembershipStatus.ACTIVE,
    },
  });

  console.log(`Seed complete. Owner: ${ownerEmail} / ${ownerPassword}`);
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`Gym: ${gym.name} (${gym.id})`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
