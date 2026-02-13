export function normalizeHostname(hostname: string): string {
  const value = hostname.trim().toLowerCase();
  const withoutProtocol = value.replace(/^https?:\/\//, '');
  const withoutPath = withoutProtocol.split('/')[0] ?? withoutProtocol;
  return withoutPath.replace(/\.$/, '');
}
