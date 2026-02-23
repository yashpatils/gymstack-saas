const DEFAULT_BASE_DOMAIN = process.env.NODE_ENV === 'development' ? 'localhost' : 'gymstack.club';

function stripProtocolAndPath(value: string): string {
  return value.replace(/^https?:\/\//i, '').split('/')[0] ?? value;
}

export function getBaseDomain(): string {
  return (process.env.BASE_DOMAIN ?? process.env.NEXT_PUBLIC_BASE_DOMAIN ?? DEFAULT_BASE_DOMAIN).toLowerCase();
}

export function getAdminHost(): string {
  const configuredAdminHost = (process.env.ADMIN_HOST ?? process.env.NEXT_PUBLIC_ADMIN_HOST ?? '').trim().toLowerCase();
  if (configuredAdminHost) {
    return stripProtocolAndPath(configuredAdminHost);
  }

  return `admin.${getBaseDomain()}`;
}

export function getMainSiteOrigin(): string {
  const configuredOrigin = (process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN ?? '').trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, '');
  }

  return `https://${getBaseDomain()}`;
}

export function getMainSiteUrl(pathname: string): string {
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getMainSiteOrigin()}${normalizedPathname}`;
}
