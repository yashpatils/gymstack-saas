export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    console.log("API request blocked: missing NEXT_PUBLIC_API_URL");
    throw new Error("Missing NEXT_PUBLIC_API_URL");
  }

  const token = localStorage.getItem("accessToken");
  const url = `${baseUrl}${path}`;

  console.log("API request:", url);

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
  });

  console.log("API response status:", response.status);

  if (response.status === 401) {
    localStorage.removeItem("accessToken");
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }

  return response;
}
