import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { securityConfig } from './config/security.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enable('trust proxy');
  app.enableCors({ origin: '*' });
  app.use(helmet());
  app.use(morgan('combined'));
  if (securityConfig.httpsRedirectEnabled) {
    app.use((req, res, next) => {
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
}

bootstrap();
