type ApiFetchInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

const DEV_LOCALHOST_API_URL = "http://localhost:3000";

let hasLoggedMissingProdApiUrl = false;
let hasLoggedDevFallback = false;

function normalizePath(path: string): string {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `/${path}`.replace(/\/+/g, "/");
}

function getNodeEnv(): string {
  return process.env.NODE_ENV ?? "";
}

function getMissingApiUrlMessage(): string {
  return "NEXT_PUBLIC_API_URL is not set. Configure NEXT_PUBLIC_API_URL for deployed environments (for example on Vercel).";
}

export function getApiBaseUrl(): string {
  const configuredUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  const nodeEnv = getNodeEnv();

  if (nodeEnv === "development") {
    if (!hasLoggedDevFallback) {
      hasLoggedDevFallback = true;
      console.warn(
        `${getMissingApiUrlMessage()} Falling back to ${DEV_LOCALHOST_API_URL} in development only.`,
      );
    }
    return DEV_LOCALHOST_API_URL;
  }

  if (nodeEnv === "production") {
    const message = getMissingApiUrlMessage();
    if (!hasLoggedMissingProdApiUrl) {
      hasLoggedMissingProdApiUrl = true;
      console.error(`❌ ${message}`);
    }
    throw new Error(message);
  }

  return "";
}

export function buildApiUrl(path: string): string {
  const normalized = normalizePath(path);

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

function isRecordBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !(value instanceof FormData)
    && !(value instanceof URLSearchParams)
    && !(value instanceof Blob)
    && !(value instanceof ArrayBuffer);
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  const requestBody = isRecordBody(init.body) ? JSON.stringify(init.body) : init.body;

  if (isRecordBody(init.body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    body: requestBody,
    headers,
    credentials: init.credentials ?? "include",
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const errorText = contentType.includes("application/json")
      ? JSON.stringify(await response.json())
      : await response.text();
    throw new Error(`Request failed (${response.status} ${response.statusText}): ${errorText}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`Expected JSON response for ${path} but received ${contentType || "unknown content type"}`);
  }

  return (await response.json()) as T;
}
