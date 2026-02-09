export const apiFetch = async (
  path: string,
  options: RequestInit = {}
): Promise<Response> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    console.error("[apiFetch] Missing NEXT_PUBLIC_API_URL");
    throw new Error("Missing backend URL");
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${baseUrl}${path}`;
  console.info(`[apiFetch] ${url}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.info(`[apiFetch] response ${response.status}`);

  return response;
};
