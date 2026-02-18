const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

export function isQaModeEnabled(value: string | undefined | null): boolean {
  if (!value) {
    return false;
  }

  return TRUTHY.has(value.trim().toLowerCase());
}

export function shouldApplyQaBypass({
  qaModeEnabled,
  userQaBypass,
}: {
  qaModeEnabled: boolean;
  userQaBypass?: boolean | null;
}): boolean {
  return qaModeEnabled && userQaBypass === true;
}
