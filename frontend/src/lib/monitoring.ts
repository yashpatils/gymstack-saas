type BreadcrumbInput = {
  category: string;
  message: string;
  data?: Record<string, unknown>;
};

type ErrorContext = {
  path: string;
  method: string;
  requestId?: string;
};

function monitoringEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT);
}

function postMonitoringEvent(payload: Record<string, unknown>): void {
  const endpoint = process.env.NEXT_PUBLIC_MONITORING_ENDPOINT;
  if (!endpoint || typeof window === 'undefined') {
    return;
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

export function initFrontendMonitoring(): void {
  if (!monitoringEnabled() || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('error', (event) => {
    postMonitoringEvent({
      event: 'frontend_unhandled_error',
      message: event.message,
      stack: event.error instanceof Error ? event.error.stack : undefined,
      route: window.location.pathname,
    });
  });
}

export function addFrontendBreadcrumb(input: BreadcrumbInput): void {
  if (!monitoringEnabled()) {
    return;
  }

  postMonitoringEvent({
    event: 'frontend_breadcrumb',
    category: input.category,
    message: input.message,
    data: input.data,
  });
}

export function setMonitoringUserContext(userId: string | null): void {
  if (!monitoringEnabled()) {
    return;
  }

  postMonitoringEvent({
    event: 'frontend_user_context',
    userId,
  });
}

export function captureFrontendApiError(error: Error, context: ErrorContext): void {
  if (!monitoringEnabled()) {
    return;
  }

  postMonitoringEvent({
    event: 'frontend_api_error',
    message: error.message,
    route: context.path,
    method: context.method,
    requestId: context.requestId,
  });
}
