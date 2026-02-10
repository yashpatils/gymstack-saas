import { apiFetch as baseApiFetch, buildApiUrl as baseBuildApiUrl } from '../../src/lib/api';

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: Record<string, unknown> | FormData | BodyInit | null;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, ...rest } = options;

  return baseApiFetch<T>(path, {
    ...rest,
    body: body as BodyInit | null | undefined,
  });
}

export function buildApiUrl(path: string): string {
  return baseBuildApiUrl(path);
}
