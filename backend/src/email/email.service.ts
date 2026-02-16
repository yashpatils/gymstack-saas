import { Injectable, Logger } from '@nestjs/common';
import { EmailConfig } from './email.config';

type EmailTag = {
  name: string;
  value: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  tags?: EmailTag[];
  debugLink?: string;
};

type ResendSuccessResponse = {
  id: string;
};

type ResendErrorResponse = {
  name?: string;
  message?: string;
  statusCode?: number;
};

export class EmailProviderError extends Error {
  statusCode?: number;
  providerCode?: string;

  constructor(message: string, statusCode?: number, providerCode?: string) {
    super(message);
    this.name = 'EmailProviderError';
    this.statusCode = statusCode;
    this.providerCode = providerCode;
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly emailConfig: EmailConfig) {}

  async sendVerifyEmail(payload: { to: string; name?: string; token: string }): Promise<void> {
    const link = `${this.emailConfig.appUrl}/verify-email?token=${encodeURIComponent(payload.token)}`;
    const greeting = payload.name ? `Hi ${payload.name},` : 'Hi there,';

    await this.sendEmail({
      to: payload.to,
      subject: 'Verify your Gymstack email',
      template: 'verify_email',
      html: this.wrapTemplate({
        title: 'Verify your email',
        greeting,
        intro: 'Welcome to Gymstack. Please verify your email address to secure your account.',
        buttonLabel: 'Verify email',
        link,
      }),
      text: `${greeting} Verify your Gymstack email: ${link}`,
      tags: [{ name: 'template', value: 'verify_email' }],
      debugLink: link,
    });
  }

  async sendResetPasswordEmail(payload: { to: string; name?: string; token: string }): Promise<void> {
    const link = `${this.emailConfig.appUrl}/reset-password?token=${encodeURIComponent(payload.token)}`;
    const greeting = payload.name ? `Hi ${payload.name},` : 'Hi there,';

    await this.sendEmail({
      to: payload.to,
      subject: 'Reset your Gymstack password',
      template: 'reset_password',
      html: this.wrapTemplate({
        title: 'Reset your password',
        greeting,
        intro: 'We received a request to reset your password. Use the button below to continue.',
        buttonLabel: 'Reset password',
        link,
      }),
      text: `${greeting} Reset your Gymstack password: ${link}`,
      tags: [{ name: 'template', value: 'reset_password' }],
      debugLink: link,
    });
  }

  async sendDeleteAccountEmail(payload: { to: string; name?: string; token: string }): Promise<void> {
    const link = `${this.emailConfig.appUrl}/confirm-delete-account?token=${encodeURIComponent(payload.token)}`;
    const greeting = payload.name ? `Hi ${payload.name},` : 'Hi there,';

    await this.sendEmail({
      to: payload.to,
      subject: 'Confirm your Gymstack account deletion',
      template: 'delete_account',
      html: this.wrapTemplate({
        title: 'Confirm account deletion',
        greeting,
        intro: 'We received a request to delete your account. Confirm this action using the button below.',
        buttonLabel: 'Confirm deletion',
        link,
      }),
      text: `${greeting} Confirm your Gymstack account deletion: ${link}`,
      tags: [{ name: 'template', value: 'delete_account' }],
      debugLink: link,
    });
  }

  async sendLocationInvite(to: string, inviteUrl: string, managerName?: string): Promise<void> {
    const greeting = managerName ? `Hi ${managerName},` : 'Hi there,';
    await this.sendEmail({
      to,
      subject: 'You are invited to manage a Gymstack location',
      template: 'location_invite',
      html: this.wrapTemplate({
        title: 'Gymstack invitation',
        greeting,
        intro: 'You have been invited to manage day-to-day operations in Gymstack.',
        buttonLabel: 'Accept invite',
        link: inviteUrl,
      }),
      text: `${greeting} You have been invited to manage day-to-day operations in Gymstack. Accept invite: ${inviteUrl}`,
      tags: [{ name: 'template', value: 'location_invite' }],
    });
  }

  async sendEmail(input: SendEmailInput): Promise<void> {
    const redactedRecipient = this.redactEmail(input.to);

    if (this.emailConfig.emailDisable || !this.emailConfig.resendApiKey) {
      this.logger.log(
        `DEV email template=${input.template} recipient=${redactedRecipient} subject="${input.subject}"`,
      );
      if (input.debugLink) {
        this.logger.log(`DEV email link template=${input.template} url=${input.debugLink}`);
      }
      return;
    }

    this.logger.log(JSON.stringify({ event: 'email_send_attempt', provider: this.emailConfig.provider, template: input.template }));

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.emailConfig.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.emailConfig.from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          tags: input.tags,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json() as ResendErrorResponse;
        this.logger.error(
          JSON.stringify({
            event: 'email_send_failure',
            provider: this.emailConfig.provider,
            template: input.template,
            status: response.status,
            message: errorPayload.message ?? 'Unknown Resend API error',
          }),
        );
        throw new EmailProviderError(errorPayload.message ?? `Email send failed with status ${response.status}`, response.status, errorPayload.name);
      }

      const result = await response.json() as ResendSuccessResponse;
      this.logger.log(
        JSON.stringify({
          event: 'email_send_success',
          provider: this.emailConfig.provider,
          template: input.template,
          messageId: result.id,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email transport error';
      this.logger.error(
        JSON.stringify({
          event: 'email_send_failure',
          provider: this.emailConfig.provider,
          template: input.template,
          status: null,
          message,
        }),
      );
      if (error instanceof EmailProviderError) {
        throw error;
      }
      throw new EmailProviderError(message);
    }
  }

  private wrapTemplate(payload: { title: string; greeting: string; intro: string; buttonLabel: string; link: string }): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827;">
        <h2 style="margin:0 0 12px 0;color:#111827;">Gymstack</h2>
        <h3 style="margin:0 0 16px 0;">${payload.title}</h3>
        <p style="margin:0 0 12px 0;">${payload.greeting}</p>
        <p style="margin:0 0 20px 0;">${payload.intro}</p>
        <a href="${payload.link}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;">${payload.buttonLabel}</a>
        <p style="margin:20px 0 0 0;font-size:13px;color:#374151;">If the button does not work, copy and paste this link into your browser:</p>
        <p style="font-size:13px;word-break:break-word;"><a href="${payload.link}">${payload.link}</a></p>
      </div>
    `;
  }

  private redactEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return '***';
    }

    const first = localPart[0] ?? '*';
    return `${first}***@${domain}`;
  }
}
