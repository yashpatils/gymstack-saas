import { ApiFetchError } from "./apiFetch";

function getErrorCode(details: unknown): string | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  if ("code" in details && typeof details.code === "string") {
    return details.code;
  }

  return null;
}

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof ApiFetchError)) {
    return error instanceof Error ? error.message : "Unable to sign in. Please try again.";
  }

  const code = getErrorCode(error.details);

  if (error.statusCode === 401) {
    return "Invalid email or password. Please try again.";
  }

  if (error.statusCode === 403 && code === "EMAIL_NOT_VERIFIED") {
    return "Please verify your email before signing in.";
  }

  if (error.statusCode === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (error.statusCode >= 500) {
    return "Server error while signing in. Please try again shortly.";
  }

  return error.message || "Unable to sign in. Please try again.";
}
