import { Logger } from '@nestjs/common';
import { EmailConfig } from './email.config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const baseConfig: EmailConfig = {
    provider: 'RESEND',
    resendApiKey: 're_test_123',
    from: 'Gymstack <no-reply@gymstack.club>',
    appUrl: 'http://localhost:3000',
    emailDisable: false,
    nodeEnv: 'development',
    isProduction: false,
  } as EmailConfig;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends email when api key is present, even outside production', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'msg_123' }),
    } as any);

    const service = new EmailService(baseConfig);

    await service.sendVerifyEmail({
      to: 'member@example.com',
      token: 'token-123',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' }),
    );
  });


  it('does not log debug token links in production fallback mode', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    const service = new EmailService({
      ...baseConfig,
      resendApiKey: undefined,
      isProduction: true,
      nodeEnv: 'production',
    } as EmailConfig);

    await service.sendVerifyEmail({
      to: 'member@example.com',
      token: 'secret-token',
    });

    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('DEV email template='));
    expect(loggerSpy).not.toHaveBeenCalledWith(expect.stringContaining('token='));
  });

  it('does not call resend when api key is missing', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch' as any);

    const service = new EmailService({
      ...baseConfig,
      resendApiKey: undefined,
    } as EmailConfig);

    await service.sendVerifyEmail({
      to: 'member@example.com',
      token: 'token-456',
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
