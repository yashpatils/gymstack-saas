import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import morgan from 'morgan';
import express from 'express';
import { AppModule } from './app.module';
import { securityConfig } from './config/security.config';
import { getRegisteredRoutes } from './debug/route-list.util';

function maskDatabaseUrlCredentials(url: string): string {
  return url.replace(/:\/\/.*@/, '://****:****@');
}

function logDatabaseIdentity(configService: ConfigService) {
  const logger = new Logger('Bootstrap');
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const prismaSchema = process.env.PRISMA_SCHEMA;
  const nodeEnv = process.env.NODE_ENV;

  logger.log(`NODE_ENV: ${nodeEnv ?? 'undefined'}`);
  logger.log(`PRISMA_SCHEMA: ${prismaSchema ?? 'undefined'}`);

  if (!databaseUrl) {
    logger.warn('DATABASE_URL is not set. Skipping database identity diagnostics.');
    return;
  }

  const maskedUrl = maskDatabaseUrlCredentials(databaseUrl);
  logger.log(`DATABASE_URL (masked): ${maskedUrl}`);

  try {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, '') || '(not set)';
    const schemaFromUrl = parsed.searchParams.get('schema') ?? '(not set)';

    logger.log(
      `Database identity => host: ${parsed.host}, database: ${databaseName}, schema: ${schemaFromUrl}`,
    );
  } catch {
    logger.warn('DATABASE_URL is not a valid URL. Could not extract host/database/schema.');
  }
}

function ensureRequiredEnv(configService: ConfigService) {
  const logger = new Logger('Bootstrap');
  // Railway (and all deployments) must provide these via environment variables.
  const required = ['DATABASE_URL', 'JWT_SECRET'] as const;

  const missing = required.filter((key) => !configService.get<string>(key));
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  if (!configService.get<string>('STRIPE_SECRET_KEY')) {
    logger.warn(
      'STRIPE_SECRET_KEY is not set. Billing endpoints will return Stripe-not-configured errors.',
    );
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/billing/webhook', express.raw({ type: 'application/json' }));

  const configService = app.get(ConfigService);
  ensureRequiredEnv(configService);
  logDatabaseIdentity(configService);

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:3000',
        'https://gymstack-saas.vercel.app',
        'https://gymstack-saas-jw4voz3tb-yashs-projects-81128ebe.vercel.app',
      ];

      if (!origin) return callback(null, true);

      const isAllowed =
        allowed.includes(origin) ||
        /^https:\/\/gymstack-saas-.*-yashs-projects-81128ebe\.vercel\.app$/.test(
          origin,
        );

      if (isAllowed) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api';
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['billing/webhook', 'health', 'debug/routes'],
  });
  app.use(helmet());
  app.use(morgan('combined'));

  if (securityConfig.httpsRedirectEnabled) {
    app.use((req: any, res: any, next: any) => {
      const isSecure =
        req.secure || req.headers['x-forwarded-proto'] === 'https';
      if (isSecure) {
        return next();
      }

      const host = req.headers.host;
      if (!host) {
        return next();
      }

      const statusCode = securityConfig.httpsRedirectStatus;
      const redirectUrl = `https://${host}${req.originalUrl}`;
      return res.redirect(statusCode, redirectUrl);
    });
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  const server = app.getHttpServer();
  const routes = getRegisteredRoutes(server);

  if (routes.length) {
    console.log('REGISTERED ROUTES:');
    routes.forEach((route) => console.log(route));
  } else {
    console.log('Could not read Express router stack to list routes.');
  }
}

bootstrap();
