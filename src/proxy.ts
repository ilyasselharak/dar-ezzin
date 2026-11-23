import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

type Rule = { to: string; statusCode: number };

// Redirects managed in Admin → SEO → Redirections. Cached per server instance and refreshed
// every minute; if Convex is unreachable the request simply continues (fail-open).
const TTL_MS = 60_000;
let cache: { at: number; rules: Map<string, Rule> } | null = null;
let inflight: Promise<Map<string, Rule>> | null = null;

async function loadRedirects(): Promise<Map<string, Rule>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rules;
  if (!inflight) {
    inflight = (async () => {
      try {
        const url = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!url) return new Map();
        const list = await new ConvexHttpClient(url).query(api.seo.redirectMap, {});
        const rules = new Map(list.map((r) => [r.from, { to: r.to, statusCode: r.statusCode }]));
        cache = { at: Date.now(), rules };
        return rules;
      } catch {
        return cache?.rules ?? new Map();
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

const PROTECTED = /^\/(admin|compte)(\/|$)/;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Optimistic auth gate only: real authorization (roles) is enforced server-side.
  if (PROTECTED.test(pathname)) {
    if (!getSessionCookie(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/connexion";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (req.method === "GET" || req.method === "HEAD") {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    const rules = await loadRedirects();
    let decoded = path;
    try {
      decoded = decodeURIComponent(path);
    } catch {}
    const rule = rules.get(path) ?? rules.get(decoded);
    if (rule) {
      const target = /^https?:\/\//i.test(rule.to) ? new URL(rule.to) : new URL(rule.to, req.nextUrl.origin);
      // Keep the query string (tracking parameters, pagination) unless the target defines its own.
      if (!target.search && req.nextUrl.search) target.search = req.nextUrl.search;
      return NextResponse.redirect(target, rule.statusCode === 302 ? 302 : 301);
    }
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, API routes, metadata files and static assets.
  matcher: ["/((?!_next/|api/|og$|sitemap|robots\\.txt|manifest\\.webmanifest|icon\\.svg|favicon\\.ico|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|map|txt|xml|woff2?)$).*)"],
};
