import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import morgan from 'morgan';
import express from 'express';
import { AppModule } from './app.module';
import { securityConfig } from './config/security.config';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/billing/webhook', express.raw({ type: 'application/json' }));

  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const frontendUrl = configService.get<string>('FRONTEND_URL');

  const configuredOrigins = [corsOrigin, frontendUrl]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map(normalizeOrigin)
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://yashpatils.github.io',
  ];

  const allowedOrigins =
    configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) {
        return cb(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const isAllowed = allowedOrigins.some(
        (allowed) =>
          normalizedOrigin === allowed || normalizedOrigin.startsWith(allowed),
      );

      if (isAllowed) {
        return cb(null, true);
      }

      return cb(new Error('CORS blocked'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 204,
  });

  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api';
  app.setGlobalPrefix(apiPrefix, { exclude: ['billing/webhook', 'health'] });
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

  const jwtSecret = configService.get<string>('JWT_SECRET');
  if (!jwtSecret) {
    const logger = new Logger('Bootstrap');
    logger.warn('JWT_SECRET is not defined. Falling back to dev secret.');
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

bootstrap();
