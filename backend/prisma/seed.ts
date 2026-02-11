const bcrypt = require('bcrypt');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const demoOrgName = 'GymStack Demo Org';
  const demoEmail = process.env.DEMO_EMAIL ?? 'demo@gymstack.dev';
  const demoPassword = process.env.DEMO_PASSWORD ?? 'demo12345';
  const demoGyms = ['Downtown Demo Gym', 'Riverside Demo Gym', 'Northside Demo Gym'];

  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      password: passwordHash,
      role: Role.OWNER,
    },
    create: {
      email: demoEmail,
      password: passwordHash,
      role: Role.OWNER,
    },
  });

  console.log(`Demo user ready: ${demoUser.email}`);

  for (const gymName of demoGyms) {
    const existingGym = await prisma.gym.findFirst({
      where: {
        ownerId: demoUser.id,
        name: gymName,
      },
    });

    if (existingGym) {
      console.log(`Demo gym already exists: ${existingGym.name}`);
      continue;
    }

    const gym = await prisma.gym.create({
      data: {
        name: gymName,
        ownerId: demoUser.id,
      },
    });

    console.log(`Demo gym created: ${gym.name}`);
  }


  await prisma.$executeRaw`
    INSERT INTO "Setting" ("key", "value", "updatedAt")
    VALUES
      ('enableBilling', 'false'::jsonb, CURRENT_TIMESTAMP),
      ('enableInvites', 'false'::jsonb, CURRENT_TIMESTAMP),
      ('enableAudit', 'true'::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO NOTHING
  `;

  console.log('Feature-flag defaults ready.');

  console.log(`Demo org ready: ${demoOrgName}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
