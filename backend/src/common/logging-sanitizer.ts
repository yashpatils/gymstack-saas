const SENSITIVE_FIELD_PATTERN = /password|token|secret|authorization|cookie/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function sanitizeForLogs(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForLogs(entry));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, entry]) => {
    if (SENSITIVE_FIELD_PATTERN.test(key)) {
      acc[key] = '[REDACTED]';
      return acc;
    }

    acc[key] = sanitizeForLogs(entry);
    return acc;
  }, {});
}

export function extractExceptionMessage(exceptionResponse: unknown, fallback: string): string {
  if (typeof exceptionResponse === 'string') {
    return exceptionResponse;
  }

  if (isRecord(exceptionResponse) && 'message' in exceptionResponse) {
    const rawMessage = exceptionResponse.message;
    if (Array.isArray(rawMessage)) {
      return rawMessage.join(', ');
    }

    if (typeof rawMessage === 'string') {
      return rawMessage;
    }
  }

  return fallback;
}
