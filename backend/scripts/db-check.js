#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function run() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('DATABASE_URL is not set. Skipping table diagnostics.');
    process.exit(0);
  }

  const prisma = new PrismaClient();

  try {
    const result = await prisma.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;",
    );

    const tables = result.map((row) => row.tablename);

    if (tables.length === 0) {
      console.log('public schema tables: (none)');
    } else {
      console.log(`public schema tables (${tables.length}): ${tables.join(', ')}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`db-check diagnostic failed: ${message}`);
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore close errors for diagnostics
    }

    process.exit(0);
  }
}

run();
