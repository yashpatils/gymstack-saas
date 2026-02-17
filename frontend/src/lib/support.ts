export type SupportContext = {
  tenantId?: string | null;
  userId?: string | null;
  requestId?: string | null;
  route?: string | null;
};

const fallbackSupportEmail = 'support@gymstack.app';

export function getSupportEmail(): string {
  const configured = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return configured && configured.length > 0 ? configured : fallbackSupportEmail;
}

export function buildSupportMailtoUrl(context: SupportContext, message: string): string {
  const subject = 'GymStack support request';
  const lines = [
    'Please describe your issue:',
    message.trim() || '(no details provided)',
    '',
    '--- Context ---',
    `tenantId: ${context.tenantId ?? 'unknown'}`,
    `userId: ${context.userId ?? 'unknown'}`,
    `requestId: ${context.requestId ?? 'unknown'}`,
    `route: ${context.route ?? 'unknown'}`,
  ];

  const params = new URLSearchParams({
    subject,
    body: lines.join('\n'),
  });

  return `mailto:${getSupportEmail()}?${params.toString()}`;
}
