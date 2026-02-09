import { apiFetch as baseApiFetch } from "../../src/lib/api";

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: Record<string, unknown> | FormData;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const resolvedHeaders = new Headers(headers);
  let resolvedBody: BodyInit | undefined;

  if (body instanceof FormData) {
    resolvedBody = body;
  } else if (body) {
    resolvedHeaders.set("Content-Type", "application/json");
    resolvedBody = JSON.stringify(body);
  }

  const response = await baseApiFetch(path, {
    ...rest,
    headers: resolvedHeaders,
    body: resolvedBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed");
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
