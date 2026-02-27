import { ConfigService } from '@nestjs/config';
import { SensitiveRateLimitService } from './sensitive-rate-limit.service';

describe('SensitiveRateLimitService', () => {
  it('keeps bucket cache bounded', () => {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => (key === 'SENSITIVE_RATE_LIMIT_MAX_BUCKETS' ? '3' : undefined)),
    } as unknown as ConfigService;

    const service = new SensitiveRateLimitService(configService);

    service.check('a', 10, 60_000);
    service.check('b', 10, 60_000);
    service.check('c', 10, 60_000);
    service.check('d', 10, 60_000);

    expect(service.getBucketCountForTesting()).toBeLessThanOrEqual(3);
  });
});
