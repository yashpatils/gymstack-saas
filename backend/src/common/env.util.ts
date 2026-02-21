import { ConfigService } from '@nestjs/config';

function readEnv(name: string, configService?: ConfigService): string | undefined {
  return configService?.get<string>(name) ?? process.env[name];
}

export function isProductionEnvironment(configService?: ConfigService): boolean {
  return (readEnv('NODE_ENV', configService) ?? '').toLowerCase() === 'production';
}

export function getRequiredEnv(name: string, configService?: ConfigService): string {
  const value = readEnv(name, configService)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getJwtSecret(configService?: ConfigService): string {
  const configuredSecret = readEnv('JWT_SECRET', configService)?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (isProductionEnvironment(configService)) {
    throw new Error('Missing required environment variable: JWT_SECRET (required in production)');
  }

  return 'dev-secret-change-me';
}

