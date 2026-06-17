/**
 * proxy.ts  — Next.js 16 route guard for Web A
 *
 * NOTE: In Next.js 16 `middleware.ts` is deprecated and renamed to `proxy.ts`.
 *       The exported function must be `export default` or named `export function proxy`.
 *
 * Responsibilities:
 *  1. Redirect unauthenticated requests to /login
 *  2. Redirect authenticated users who lack permission for this app to /403
 *
 * SSO_CLIENT_ID env var identifies this app inside the `apps[]`
 * claim that the SSO server embeds in every token.
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APP_SLUG = process.env.SSO_CLIENT_ID!;

/** Paths that bypass the auth check entirely */
const PUBLIC_PREFIXES = ["/api/auth", "/login", "/403"];

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  // Pass through public paths and ALL static / browser-auto-requested assets
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")   ||
    pathname.startsWith("/apple-touch-icon") ||
    pathname.startsWith("/robots.txt")       ||
    pathname.startsWith("/sitemap")          ||
    pathname.startsWith("/manifest")         ||
    pathname.startsWith("/icon")
  ) {
    return NextResponse.next();
  }

  const session = req.auth as { user?: { apps?: string[] } } | null;

  // ── Not authenticated → send to /login ────────────────────────────────
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // ── Authenticated but not authorised for this app → 403 ───────────────
  const apps = session.user?.apps ?? [];
  if (!apps.includes(APP_SLUG)) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Exclude Next.js internals and every common browser-auto-requested file
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|apple-touch-icon|robots\\.txt|sitemap|manifest|icon).*)",
  ],
};
