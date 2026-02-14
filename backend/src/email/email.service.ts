import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EmailProvider = 'RESEND';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly appUrl: string;
  private readonly from: string;
  private readonly provider: EmailProvider;
  private readonly resendApiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    this.from = this.configService.get<string>('EMAIL_FROM') ?? 'Gymstack <no-reply@gymstack.club>';
    this.provider = 'RESEND';
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY');
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.sendMail({
      to,
      subject: 'Verify your Gymstack email',
      html: `<p>Welcome to Gymstack.</p><p>Please verify your email address to secure your account.</p><p><a href="${link}">Verify email</a></p>`,
      text: `Welcome to Gymstack. Verify your email by visiting: ${link}`,
    });
  }

  async sendDeleteAccountConfirmation(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/confirm-delete-account?token=${encodeURIComponent(token)}`;
    await this.sendMail({
      to,
      subject: 'Confirm your Gymstack account deletion',
      html: `<p>We received a request to delete your Gymstack account.</p><p>Confirm deletion by clicking below.</p><p><a href="${link}">Confirm account deletion</a></p>`,
      text: `Confirm your account deletion by visiting: ${link}`,
    });
  }

  private async sendMail(payload: { to: string; subject: string; html: string; text: string }): Promise<void> {
    if (!this.resendApiKey) {
      this.logger.warn(`Skipping email send because RESEND_API_KEY is not configured. recipient=${payload.to}`);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      this.logger.error(`Email provider request failed (${response.status}): ${details}`);
    }
  }
}
