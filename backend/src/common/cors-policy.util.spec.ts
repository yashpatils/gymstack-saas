import cors from 'cors';
import express from 'express';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { getAllowedOriginRegexes, getAllowedOrigins, isOriginAllowed } from './cors-policy.util';

describe('cors-policy.util', () => {
  function buildConfig(values: Record<string, string | undefined>): ConfigService {
    return {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
  }

  it('allows configured production origins and controlled preview domains', () => {
    const config = buildConfig({
      ALLOWED_ORIGINS: 'https://app.partner.com',
      FRONTEND_URL: undefined,
      ALLOWED_ORIGIN_REGEXES: undefined,
    });

    const allowlist = getAllowedOrigins(config);
    const regexes = getAllowedOriginRegexes(config, true);

    expect(isOriginAllowed('https://app.partner.com', allowlist, regexes)).toBe(true);
    expect(isOriginAllowed('https://gymstack-saas-git-main-yashpatils-projects.vercel.app', allowlist, regexes)).toBe(true);
  });

  it('blocks unapproved vercel projects in production', () => {
    const config = buildConfig({
      ALLOWED_ORIGINS: undefined,
      FRONTEND_URL: undefined,
      ALLOWED_ORIGIN_REGEXES: undefined,
    });

    const allowlist = getAllowedOrigins(config);
    const regexes = getAllowedOriginRegexes(config, true);

    expect(isOriginAllowed('https://attacker-project.vercel.app', allowlist, regexes)).toBe(false);
  });

  it('returns CORS headers for allowed origins with credentials and omits them for blocked origins', async () => {
    const config = buildConfig({
      ALLOWED_ORIGINS: undefined,
      FRONTEND_URL: undefined,
      ALLOWED_ORIGIN_REGEXES: undefined,
    });

    const allowlist = getAllowedOrigins(config);
    const regexes = getAllowedOriginRegexes(config, true);
    const app = express();

    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) {
            return callback(null, true);
          }

          return callback(null, isOriginAllowed(origin, allowlist, regexes));
        },
        credentials: true,
      }),
    );

    app.get('/cors', (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const allowedResponse = await request(app)
      .get('/cors')
      .set('Origin', 'https://gymstack.club');

    expect(allowedResponse.headers['access-control-allow-origin']).toBe('https://gymstack.club');
    expect(allowedResponse.headers['access-control-allow-credentials']).toBe('true');

    const blockedResponse = await request(app)
      .get('/cors')
      .set('Origin', 'https://attacker-project.vercel.app');

    expect(blockedResponse.headers['access-control-allow-origin']).toBeUndefined();
    expect(blockedResponse.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
