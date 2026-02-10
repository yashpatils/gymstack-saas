const bcrypt = require('bcrypt');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to run seed');
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let adminUser = existingAdmin;

  if (!adminUser) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: passwordHash,
        role: Role.ADMIN,
      },
    });

    console.log(`Created admin user: ${adminUser.email}`);
  } else {
    console.log(`Admin user already exists: ${adminUser.email}`);
  }

  const sampleGymName = 'Sample Gym';
  const existingGym = await prisma.gym.findFirst({
    where: {
      ownerId: adminUser.id,
      name: sampleGymName,
    },
  });

  if (!existingGym) {
    const gym = await prisma.gym.create({
      data: {
        name: sampleGymName,
        ownerId: adminUser.id,
      },
    });

    console.log(`Created sample gym: ${gym.name}`);
  } else {
    console.log(`Sample gym already exists: ${existingGym.name}`);
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
