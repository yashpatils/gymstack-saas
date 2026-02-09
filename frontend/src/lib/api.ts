export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    console.log("API request blocked: missing NEXT_PUBLIC_API_URL");
    throw new Error("Missing NEXT_PUBLIC_API_URL");
  }

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("accessToken")
      : null;
  const url = `${baseUrl}${path}`;

  console.log("API request:", url);

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log("API response status:", response.status);

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken");
    }
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }

  return response;
}
