export const SITE_NAME = "GymStack";
export const SITE_DOMAIN = "gymstack.club";
export const SITE_URL = "https://gymstack.club";
export const SUPPORT_EMAIL = "support@gymstack.club";
export const DEMO_EMAIL = "sales@gymstack.club";

export const defaultOgImage = "/og-default.svg";

export function toAbsoluteUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_URL}${normalizedPath}`;
}
