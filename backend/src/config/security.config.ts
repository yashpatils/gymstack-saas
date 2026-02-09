const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const securityConfig = {
  httpsRedirectEnabled: toBoolean(process.env.HTTPS_REDIRECT, true),
  httpsRedirectStatus: toNumber(process.env.HTTPS_REDIRECT_STATUS, 308),
  throttleTtl: toNumber(process.env.THROTTLE_TTL, 60),
  throttleLimit: toNumber(process.env.THROTTLE_LIMIT, 100),
};
