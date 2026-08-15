# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **template** for a Next.js app that acts as an OAuth2 client of a central SSO server. It stores no passwords and has no user database of its own — every identity fact (`id`, `role`, `apps[]`) arrives as a claim from the SSO server's `/api/oauth/userinfo` and lives only in this app's own JWT session cookie.

Because it's a template, values specific to one deployment (hostnames, app name, client slug) belong in `.env`, not in committed source. `.env*` is gitignored; `.env.example` is the committed contract.

## Commands

```bash
pnpm dev              # dev server — NOTE: hardcodes --port 3001
pnpm dev --port 3007  # last --port flag wins, so this overrides it
pnpm build
pnpm start            # also hardcoded to 3001
npx tsc --noEmit      # the only checking step that exists
```

There is **no test runner, no ESLint config, and no lint script**. `npx tsc --noEmit` is the whole verification story — run it after changes. Requires Node >= 23.

## Architecture

### The authorization model has two layers

Authentication and authorization are separate, and both are enforced against the same `apps[]` claim:

1. `src/proxy.ts` — edge guard. No session → redirect `/login`; session without `SSO_CLIENT_ID` in `apps[]` → redirect `/403`.
2. `src/app/page.tsx` — recomputes `hasAccess` itself and renders a denial banner rather than trusting the guard.

Both read `SSO_CLIENT_ID` as the app's identity. Changing the slug changes what the user must be granted on the SSO server, **and** changes every cookie name (see below) — so it invalidates existing sessions.

### `proxy.ts`, not `middleware.ts`

Next.js 16 renamed middleware to `proxy.ts`; the export must be `export default` or `export function proxy`. The file carries both a `config.matcher` regex *and* an in-body prefix allowlist (`PUBLIC_PREFIXES`, `/_next/`, favicon, etc.). They overlap deliberately — the matcher can't express everything the body needs. When adding a public route, update both.

### Cookie names are namespaced by `SSO_CLIENT_ID`

Every cookie (`sessionToken`, `csrfToken`, `state`, `pkceCodeVerifier`, …) is prefixed with the client slug in `src/lib/auth.ts`. This is not cosmetic: in dev, the SSO server and all client apps share `localhost`, so they receive each other's cookies. Without the prefix, this app tries to decrypt the SSO server's `authjs.session-token` with its own `AUTH_SECRET` and throws `JWTSessionError` / "no matching decryption secret". `AUTH_SECRET` must differ from the SSO server's.

### PKCE is deliberately disabled

`checks: ["state"]` in the provider config. The SSO token endpoint authenticates with `client_secret_post`, not `code_verifier`. NextAuth v5 enables PKCE by default, and leaving it on makes the token exchange fail. Don't "fix" this without changing the SSO server first.

### Custom claims flow through three places

`role` and `apps` are non-standard, so adding another claim means touching all of:

- `profile()` in `src/lib/auth.ts` — maps the raw userinfo payload
- `jwt` / `session` callbacks in the same file — the `profile` arg is cast through `unknown` because NextAuth's `Profile` type doesn't declare custom claims
- `src/types/next-auth.d.ts` — module augmentation for `Session["user"]` and `JWT`; this is what lets the session callback assign without casts

### Sign-in / sign-out are Server Actions

`AppShell` is a client component but never imports auth code. The dashboard passes `signOutAction` (a `"use server"` function) down as a prop and it's wired to a `<form>`, keeping auth logic off the client bundle. Preserve this shape when editing the shell.

## Env vars

Read `.env.example` for the full list. Non-obvious ones:

- `APP_NAME` — display name. Every page reads it with a `?? "SSO Client"` fallback. **Keep the fallback** — an unguarded `process.env.APP_NAME!` renders `undefined` and crashes on `.charAt(0)`.
- `ALLOWED_DEV_ORIGINS` — comma-separated hostnames allowed to load `/_next/*` and HMR. Only needed when reaching `next dev` through a proxy instead of localhost, otherwise hot reload silently dies. `next.config.ts` parses it; empty/unset yields `[]`. A leading `*.` matches **exactly one label**, so it does not cover the bare domain — list the apex separately.
- `AUTH_URL` — must include the `/api/auth` suffix and match the port you actually run on (the `dev` script's hardcoded 3001 is frequently not it).
- `DATABASE_URL` and friends are declared in `.env.example` but nothing in `src/` reads them yet.

## Styling

Tailwind v4 via `@tailwindcss/postcss`, no `tailwind.config.js`. The palette is CSS custom properties in `src/app/globals.css`, exposed to Tailwind through `@theme inline`. Use semantic classes (`bg-card`, `text-muted-foreground`, `border-border`) rather than raw color scales so dark mode works for free.

Dark mode is class-based via `@custom-variant dark`, applied by a blocking inline script in `layout.tsx` before paint. `ThemeToggle` uses a `mounted` guard so the icon never causes a hydration mismatch — any component reading theme state at render time needs the same guard.
