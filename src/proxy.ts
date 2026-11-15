import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic gate only: redirects anonymous visitors away from protected areas.
 * Real authorization (roles) is enforced server-side in layouts, actions and route handlers.
 */
export function proxy(req: NextRequest) {
  if (!getSessionCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/compte/:path*"],
};
