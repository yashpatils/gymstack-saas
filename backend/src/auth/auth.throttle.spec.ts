import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SensitiveRateLimitService } from '../common/sensitive-rate-limit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController throttling', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 2 }] })],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({ status: 'SUCCESS', accessToken: 'a', refreshToken: 'b', user: { id: '1', email: 'x@y.com', role: 'USER', orgId: '' }, memberships: [] }),
          },
        },
        { provide: SensitiveRateLimitService, useValue: { check: jest.fn() } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 once throttle limit is exceeded', async () => {
    const body = { email: 'x@y.com', password: 'secret' };
    await request(app.getHttpServer()).post('/auth/login').send(body).expect(201);
    await request(app.getHttpServer()).post('/auth/login').send(body).expect(201);
    await request(app.getHttpServer()).post('/auth/login').send(body).expect(429);
  });
});
