export function toOptionalString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function toStringWithDefault(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

export function firstString(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') {
    return v;
  }

  if (Array.isArray(v)) {
    return v.find((x) => typeof x === 'string');
  }

  return undefined;
}
