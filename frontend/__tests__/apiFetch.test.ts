import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_API_URL;

describe("apiFetch base URL resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  afterEach(() => {
    if (ORIGINAL_API_URL) {
      process.env.NEXT_PUBLIC_API_URL = ORIGINAL_API_URL;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }

    if (ORIGINAL_NODE_ENV) {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    }
  });

  it("uses NEXT_PUBLIC_API_URL when configured", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/";

    const { getApiBaseUrl, buildApiUrl } = await import("../src/lib/apiFetch");

    expect(getApiBaseUrl()).toBe("https://api.example.com");
    expect(buildApiUrl("/api/auth/me")).toBe("https://api.example.com/api/auth/me");
  });

  it("falls back to localhost in development when missing", async () => {
    process.env.NODE_ENV = "development";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { getApiBaseUrl } = await import("../src/lib/apiFetch");

    expect(getApiBaseUrl()).toBe("http://localhost:3000");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("logs and throws in production when missing", async () => {
    process.env.NODE_ENV = "production";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getApiBaseUrl } = await import("../src/lib/apiFetch");

    expect(() => getApiBaseUrl()).toThrow("NEXT_PUBLIC_API_URL is not set");
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
