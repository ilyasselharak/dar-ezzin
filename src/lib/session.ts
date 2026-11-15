import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type AppRole = "CUSTOMER" | "STAFF" | "ADMIN";

/** Memoised per request so layouts and pages share one lookup. */
export const getSession = cache(async () => {
  // Cookie cache is bypassed so role changes / revocations apply immediately.
  return auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
});

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

function roleOf(user: { role?: string | null } | null | undefined): AppRole {
  return (user?.role as AppRole) ?? "CUSTOMER";
}

export function isStaff(user: { role?: string | null } | null | undefined) {
  const r = roleOf(user);
  return r === "STAFF" || r === "ADMIN";
}

export function isAdmin(user: { role?: string | null } | null | undefined) {
  return roleOf(user) === "ADMIN";
}

/** For pages/layouts: redirects when the visitor is not signed in. */
export async function requireUser(next = "/compte") {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return user;
}

/** For admin pages/layouts. */
export async function requireStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/admin");
  if (!isStaff(user)) redirect("/");
  return user;
}

export class AuthorizationError extends Error {
  constructor(message = "Accès refusé") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** For server actions & route handlers: throws instead of redirecting. */
export async function assertStaff() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) throw new AuthorizationError();
  return user;
}

export async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new AuthorizationError();
  return user;
}
