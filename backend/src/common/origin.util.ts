export function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const isDefaultHttpsPort = protocol === 'https:' && url.port === '443';
    const isDefaultHttpPort = protocol === 'http:' && url.port === '80';
    const port = isDefaultHttpsPort || isDefaultHttpPort ? '' : url.port;
    const host = port ? `${hostname}:${port}` : hostname;

    return `${protocol}//${host}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}
