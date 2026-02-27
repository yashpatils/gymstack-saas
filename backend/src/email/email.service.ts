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
    await this.sendTemplatedActionEmail({ to: payload.to, name: payload.name, template: 'verify_email', subject: 'Verify your Gymstack email', title: 'Verify your email', intro: 'Welcome to Gymstack. Please verify your email address to secure your account.', buttonLabel: 'Verify email', link });
  }

  async sendResetPasswordEmail(payload: { to: string; name?: string; token: string }): Promise<void> {
    const link = `${this.emailConfig.appUrl}/reset-password?token=${encodeURIComponent(payload.token)}`;
    await this.sendTemplatedActionEmail({ to: payload.to, name: payload.name, template: 'reset_password', subject: 'Reset your Gymstack password', title: 'Reset your password', intro: 'We received a request to reset your password. Use the button below to continue.', buttonLabel: 'Reset password', link });
  }



  async sendEmailChangeOtp(payload: { to: string; otp: string; expiresInSeconds: number }): Promise<void> {
    await this.sendTemplatedActionEmail({
      to: payload.to,
      template: 'email_change_otp',
      subject: 'Your Gymstack email change code',
      title: 'Confirm your new email',
      intro: `Use this one-time code to confirm your new email address: ${payload.otp}. It expires in ${Math.floor(payload.expiresInSeconds / 60)} minutes.`,
      buttonLabel: 'Open account settings',
      link: `${this.emailConfig.appUrl}/platform/account`,
    });
  }

  async sendEmailChangedNotice(payload: { to: string; newEmail: string }): Promise<void> {
    await this.sendTemplatedActionEmail({
      to: payload.to,
      template: 'email_change_notice',
      subject: 'Your Gymstack email was changed',
      title: 'Email address changed',
      intro: `Your Gymstack sign-in email was changed to ${payload.newEmail}. If this was not you, please reset your password immediately and contact support.`,
      buttonLabel: 'Review account security',
      link: `${this.emailConfig.appUrl}/platform/account`,
    });
  }

  async sendDeleteAccountEmail(payload: { to: string; name?: string; token: string }): Promise<void> {
    const link = `${this.emailConfig.appUrl}/confirm-delete-account?token=${encodeURIComponent(payload.token)}`;
    await this.sendTemplatedActionEmail({ to: payload.to, name: payload.name, template: 'delete_account', subject: 'Confirm your Gymstack account deletion', title: 'Confirm account deletion', intro: 'We received a request to delete your account. Confirm this action using the button below.', buttonLabel: 'Confirm deletion', link });
  }

    async sendWelcomeTenantOwner(payload: { to: string; name?: string; tenantName: string }): Promise<void> {
    await this.sendTemplatedActionEmail({ to: payload.to, name: payload.name, template: 'welcome_tenant_owner', subject: `Welcome to Gymstack, ${payload.tenantName}`, title: 'Welcome to Gymstack', intro: `Your tenant ${payload.tenantName} is ready. Start by inviting your staff and configuring your first location.`, buttonLabel: 'Open dashboard', link: `${this.emailConfig.appUrl}/platform` });
  }

  async sendInviteStaff(payload: { to: string; inviteUrl: string; managerName?: string }): Promise<void> {
    await this.sendTemplatedActionEmail({ to: payload.to, name: payload.managerName, template: 'invite_staff', subject: 'You are invited to Gymstack staff workspace', title: 'Staff invitation', intro: 'You have been invited to manage day-to-day operations in Gymstack.', buttonLabel: 'Accept invite', link: payload.inviteUrl });
  }

  async sendInviteClient(payload: { to: string; inviteUrl: string; name?: string }): Promise<void> {
    await this.sendTemplatedActionEmail({ to: payload.to, name: payload.name, template: 'invite_client', subject: 'You are invited to Gymstack', title: 'Client invitation', intro: 'Your gym invited you to join Gymstack and access classes, memberships, and bookings.', buttonLabel: 'Accept invite', link: payload.inviteUrl });
  }

  async sendBookingConfirmation(payload: { to: string; name?: string; sessionName: string; startsAtIso: string; locationName?: string }): Promise<void> {
    await this.sendTemplatedActionEmail({ to: payload.to, name: payload.name, template: 'booking_confirmation', subject: `Booking confirmed: ${payload.sessionName}`, title: 'Booking confirmed', intro: `Your booking for ${payload.sessionName} is confirmed for ${new Date(payload.startsAtIso).toLocaleString()}.${payload.locationName ? ` Location: ${payload.locationName}.` : ''}`, buttonLabel: 'View bookings', link: `${this.emailConfig.appUrl}/my-bookings` });
  }

  async sendBookingReminder(payload: { to: string; name?: string; sessionName: string; startsAtIso: string }): Promise<void> {
    await this.sendTemplatedActionEmail({ to: payload.to, name: payload.name, template: 'booking_reminder', subject: `Reminder: ${payload.sessionName}`, title: 'Upcoming booking reminder', intro: `Friendly reminder: ${payload.sessionName} starts at ${new Date(payload.startsAtIso).toLocaleString()}.`, buttonLabel: 'Open booking', link: `${this.emailConfig.appUrl}/my-bookings` });
  }

  async sendLocationInvite(to: string, inviteUrl: string, managerName?: string): Promise<void> {
    await this.sendInviteStaff({ to, inviteUrl, managerName });
  }

  async sendTemplatedActionEmail(payload: { to: string; name?: string; template: string; subject: string; title: string; intro: string; buttonLabel: string; link: string }): Promise<void> {
    const greeting = payload.name ? `Hi ${payload.name},` : 'Hi there,';
    await this.sendEmail({
      to: payload.to,
      subject: payload.subject,
      template: payload.template,
      html: this.wrapTemplate({ title: payload.title, greeting, intro: payload.intro, buttonLabel: payload.buttonLabel, link: payload.link }),
      text: `${greeting} ${payload.intro} ${payload.link}`,
      tags: [{ name: 'template', value: payload.template }],
      debugLink: payload.link,
    });
  }

  async sendEmail(input: SendEmailInput): Promise<void> {
    const redactedRecipient = this.redactEmail(input.to);
    if (this.emailConfig.emailDisable || !this.emailConfig.resendApiKey) {
      this.logger.log(`DEV email template=${input.template} recipient=${redactedRecipient} subject="${input.subject}"`);
      if (input.debugLink && !this.emailConfig.isProduction) {
        this.logger.log(`DEV email link template=${input.template} url=${this.redactDebugLink(input.debugLink)}`);
      }
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.emailConfig.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.emailConfig.from, to: [input.to], subject: input.subject, html: input.html, text: input.text, tags: input.tags }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json()) as ResendErrorResponse;
        throw new EmailProviderError(errorPayload.message ?? `Email send failed with status ${response.status}`, response.status, errorPayload.name);
      }

      const result = (await response.json()) as ResendSuccessResponse;
      this.logger.log(JSON.stringify({ event: 'email_send_success', provider: this.emailConfig.provider, template: input.template, messageId: result.id }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email transport error';
      if (error instanceof EmailProviderError) {
        throw error;
      }
      throw new EmailProviderError(message);
    }
  }

  private wrapTemplate(payload: { title: string; greeting: string; intro: string; buttonLabel: string; link: string }): string {
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827;"><h2 style="margin:0 0 12px 0;color:#111827;">Gymstack</h2><h3 style="margin:0 0 16px 0;">${payload.title}</h3><p style="margin:0 0 12px 0;">${payload.greeting}</p><p style="margin:0 0 20px 0;">${payload.intro}</p><a href="${payload.link}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;">${payload.buttonLabel}</a><p style="margin:20px 0 0 0;font-size:13px;color:#374151;">If the button does not work, copy and paste this link into your browser:</p><p style="font-size:13px;word-break:break-word;"><a href="${payload.link}">${payload.link}</a></p></div>`;
  }


  private redactDebugLink(link: string): string {
    try {
      const parsed = new URL(link);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return '[redacted]';
    }
  }

  private redactEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return '***';
    }
    return `${localPart[0] ?? '*'}***@${domain}`;
  }
}
