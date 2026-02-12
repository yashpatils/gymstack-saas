export type Role = "OWNER" | "ADMIN" | "MEMBER";

// Backward-compatible alias used across the app.
export type AppRole = Role;

export function normalizeRole(input?: string | null): Role {
  if (input === "OWNER" || input === "ADMIN" || input === "MEMBER") {
    return input;
  }

  return "MEMBER";
}

export function requireRole(userRole: Role, allowed: Role[]): boolean {
  return allowed.includes(userRole);
}

export function canManageUsers(role?: string | null): boolean {
  return requireRole(normalizeRole(role), ["OWNER", "ADMIN"]);
}

export function canManageBilling(role?: string | null): boolean {
  return canManageUsers(role);
}

export function canManageGyms(role?: string | null): boolean {
  return canManageUsers(role);
}
