import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import morgan from 'morgan';
import express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionWithRequestIdFilter } from './common/http-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import { securityConfig } from './config/security.config';
import { getRegisteredRoutes } from './debug/route-list.util';
import { PrismaService } from './prisma/prisma.service';

const DEFAULT_FRONTEND_ALLOWLIST = ['http://localhost:3000'];

function normalizeBaseDomain(value: string | undefined): string | null {
  const normalized = (value ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return normalized || null;
}

function getBaseDomain(configService: ConfigService): string | null {
  return normalizeBaseDomain(configService.get<string>('BASE_DOMAIN') ?? configService.get<string>('NEXT_PUBLIC_BASE_DOMAIN'));
}

function isProductionEnvironment(configService: ConfigService): boolean {
  return (configService.get<string>('NODE_ENV') ?? '').toLowerCase() === 'production';
}

function getCorsAllowlist(configService: ConfigService): string[] {
  const envValue = configService.get<string>('FRONTEND_URL');
  const configured =
    envValue
      ?.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean) ?? [];

  if (configured.length) {
    return configured;
  }

  return DEFAULT_FRONTEND_ALLOWLIST;
}

function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  return raw
    .replace(/(password|pwd|token|secret|apikey|api_key)=([^\s&]+)/gi, '$1=****')
    .replace(/(postgres(?:ql)?:\/\/)([^\s@]+)@/gi, '$1****:****@');
}

function maskDatabaseUrlCredentials(url: string): string {
  return url.replace(/:\/\/.*@/, '://****:****@');
}

function logDatabaseIdentity(configService: ConfigService) {
  const logger = new Logger('Bootstrap');
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const prismaSchema = process.env.PRISMA_SCHEMA;
  const nodeEnv = configService.get<string>('NODE_ENV');
  const isProduction = isProductionEnvironment(configService);

  logger.log(`NODE_ENV: ${nodeEnv ?? 'undefined'}`);
  logger.log(`PRISMA_SCHEMA: ${prismaSchema ?? 'undefined'}`);

  if (!databaseUrl) {
    logger.warn('DATABASE_URL is not set. Skipping database identity diagnostics.');
    return;
  }

  if (!isProduction) {
    const maskedUrl = maskDatabaseUrlCredentials(databaseUrl);
    logger.log(`DATABASE_URL (masked): ${maskedUrl}`);
  } else {
    logger.log('DATABASE_URL configured: yes');
  }

  try {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, '') || '(not set)';
    const schemaFromUrl = parsed.searchParams.get('schema') ?? '(not set)';

    if (!isProduction) {
      logger.log(
        `Database identity => host: ${parsed.host}, database: ${databaseName}, schema: ${schemaFromUrl}`,
      );
    } else {
      logger.log(`Database identity => database: ${databaseName}, schema: ${schemaFromUrl}`);
    }
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

async function logIntegrationStatus(
  configService: ConfigService,
  prismaService: PrismaService,
) {
  const logger = new Logger('Bootstrap');
  const stripeEnabled = Boolean(configService.get<string>('STRIPE_SECRET_KEY'));

  let databaseConnected = false;
  try {
    await prismaService.$queryRawUnsafe('SELECT 1');
    databaseConnected = true;
  } catch (error) {
    const message = sanitizeErrorMessage(error);
    logger.warn(`Database ping failed: ${message}`);
  }

  logger.log(
    `Optional integrations => stripe: ${stripeEnabled ? 'enabled' : 'disabled'}`,
  );
  logger.log(`Database connected: ${databaseConnected ? 'yes' : 'no'}`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use('/billing/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);
  const isProduction = isProductionEnvironment(configService);
  const corsAllowlist = getCorsAllowlist(configService);
  ensureRequiredEnv(configService);
  logDatabaseIdentity(configService);
  await logIntegrationStatus(configService, prismaService);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const originHost = (() => {
        try {
          return new URL(origin).host.toLowerCase();
        } catch {
          return '';
        }
      })();
      const baseDomain = getBaseDomain(configService);

      const isBaseDomainOrigin = Boolean(baseDomain) &&
        (originHost === baseDomain || originHost.endsWith(`.${baseDomain}`));
      const isVercelPreview = /\.vercel\.app$/i.test(originHost) &&
        !Boolean(baseDomain && (originHost === baseDomain || originHost.endsWith(`.${baseDomain}`)));

      const isAllowed = corsAllowlist.includes(origin) || isBaseDomainOrigin || isVercelPreview;

      if (isAllowed) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials: true,
    optionsSuccessStatus: 204,
  });

  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api';
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['', '/', 'billing/webhook', 'health', 'api/health', 'debug/routes'],
  });

  app.use(requestIdMiddleware);

  app.useGlobalFilters(new HttpExceptionWithRequestIdFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(helmet());
  morgan.token('request-id', (req) => req.requestId ?? '-');
  app.use(
    morgan(':method :url :status :res[content-length] - :response-time ms request_id=:request-id'),
  );

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
  await app.listen(port, '0.0.0.0');

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
