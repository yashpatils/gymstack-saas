import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import morgan from 'morgan';
import express from 'express';
import { AppModule } from './app.module';
import { securityConfig } from './config/security.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/billing/webhook', express.raw({ type: 'application/json' }));

  const configService = app.get(ConfigService);
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:3000',
        'https://gymstack-saas-jw4voz3tb-yashs-projects-81128ebe.vercel.app',
      ];

      // Allow no-origin requests (like curl, server-to-server)
      if (!origin) return callback(null, true);

      // Allow exact match + allow all Vercel preview URLs for this project
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
