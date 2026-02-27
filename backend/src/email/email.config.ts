import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type EmailProvider = 'RESEND';

@Injectable()
export class EmailConfig {
  private readonly logger = new Logger(EmailConfig.name);

  readonly provider: EmailProvider;
  readonly resendApiKey?: string;
  readonly from: string;
  readonly appUrl: string;
  readonly emailDisable: boolean;
  readonly nodeEnv: string;
  readonly isProduction: boolean;
  readonly allowEmailDisableInProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    const configuredProvider = (this.configService.get<string>('EMAIL_PROVIDER') ?? 'RESEND').toUpperCase();
    if (configuredProvider !== 'RESEND') {
      throw new Error(`Unsupported EMAIL_PROVIDER: ${configuredProvider}`);
    }

    this.provider = 'RESEND';
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY')?.trim() || undefined;
    this.from = this.configService.get<string>('EMAIL_FROM')?.trim() || 'Gymstack <no-reply@gymstack.club>';
    this.appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const emailDisableRaw = (this.configService.get<string>('EMAIL_DISABLE') ?? 'false').trim().toLowerCase();
    this.emailDisable = ['true', '1', 'yes', 'on'].includes(emailDisableRaw);
    this.nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
    this.isProduction = this.nodeEnv === 'production';
    this.allowEmailDisableInProduction = (this.configService.get<string>('ALLOW_EMAIL_DISABLE_IN_PRODUCTION') ?? 'false').trim().toLowerCase() === 'true';

    this.validate();
  }

  private validate(): void {
    if (this.isProduction && this.emailDisable && !this.allowEmailDisableInProduction) {
      throw new Error('EMAIL_DISABLE=true is not allowed in production unless ALLOW_EMAIL_DISABLE_IN_PRODUCTION=true');
    }

    if (this.provider === 'RESEND' && !this.resendApiKey) {
      if (this.isProduction) {
        throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=RESEND in production');
      }

      this.logger.warn('RESEND_API_KEY is missing; email delivery will use development fallback logs.');
    }
  }
}
