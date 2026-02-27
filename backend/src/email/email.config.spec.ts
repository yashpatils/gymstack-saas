import { ConfigService } from '@nestjs/config';
import { EmailConfig } from './email.config';

describe('EmailConfig', () => {
  it('trims RESEND_API_KEY and EMAIL_FROM values', () => {
    const values: Record<string, string> = {
      EMAIL_PROVIDER: 'RESEND',
      RESEND_API_KEY: '  re_test_key  ',
      EMAIL_FROM: '  Gymstack <support@example.com>  ',
      NODE_ENV: 'development',
      EMAIL_DISABLE: 'false',
    };

    const configService = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    const config = new EmailConfig(configService);

    expect(config.resendApiKey).toBe('re_test_key');
    expect(config.from).toBe('Gymstack <support@example.com>');
  });

  it('parses EMAIL_DISABLE truthy variants', () => {
    const values: Record<string, string> = {
      EMAIL_PROVIDER: 'RESEND',
      RESEND_API_KEY: 're_test_key',
      NODE_ENV: 'development',
      EMAIL_DISABLE: ' YES ',
    };

    const configService = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    const config = new EmailConfig(configService);

    expect(config.emailDisable).toBe(true);
  });
});

it('throws when EMAIL_DISABLE is enabled in production without explicit override', () => {
  const values: Record<string, string> = {
    EMAIL_PROVIDER: 'RESEND',
    RESEND_API_KEY: 're_test_key',
    NODE_ENV: 'production',
    EMAIL_DISABLE: 'true',
  };

  const configService = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;

  expect(() => new EmailConfig(configService)).toThrow('EMAIL_DISABLE=true is not allowed in production');
});
