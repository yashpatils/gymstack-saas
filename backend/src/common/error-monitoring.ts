import { Logger } from '@nestjs/common';

const logger = new Logger('ErrorMonitoring');

export function captureBackendError(payload: Record<string, unknown>): void {
  const endpoint = process.env.MONITORING_WEBHOOK_URL?.trim();
  if (!endpoint) {
    return;
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((error: unknown) => {
    logger.warn(`Monitoring webhook delivery failed: ${error instanceof Error ? error.message : String(error)}`);
  });
}
