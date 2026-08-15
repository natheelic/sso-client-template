# sso-client-template

A Next.js 16 starter for building an application that authenticates against a central SSO server.

Clone it, point it at your SSO server, and you get sign-in, route protection, per-app authorization, and a responsive dashboard shell with light/dark theming — without writing any auth code.

This app stores **no passwords and no user table**. Identity (`id`, `role`, `apps[]`) arrives as claims from the SSO server and lives only in this app's own session cookie.

## Requirements

- Node.js >= 23
- pnpm 10.24.0 (pinned via `packageManager`)
- A reachable SSO server, and a client slug + secret registered on it for this app

## Setup

```bash
pnpm install
cp .env.example .env
```

Then fill in `.env`:

| Variable | What it is |
| --- | --- |
| `APP_NAME` | Display name, shown in the navbar, footer, login and 403 pages |
| `SSO_URL` | Base URL of the SSO server |
| `SSO_CLIENT_ID` | This app's registered slug on the SSO server |
| `SSO_CLIENT_SECRET` | This app's secret, issued when the app was registered |
| `AUTH_SECRET` | Random secret for this app's own sessions — **must differ from the SSO server's** |
| `AUTH_URL` | This app's public URL **including the `/api/auth` suffix** |
| `ALLOWED_DEV_ORIGINS` | Optional; only needed when dev runs behind a proxy (see below) |

Generate `AUTH_SECRET` with:

```bash
openssl rand -hex 32
```

Then start it:

```bash
pnpm dev
```

> The `dev` and `start` scripts hardcode `--port 3001`. To use another port, append your own flag — the last one wins:
> ```bash
> pnpm dev --port 3007
> ```
> Whatever port you settle on must match the port in `AUTH_URL`.

### On the SSO server side

The SSO server needs this app registered with:

- the same slug you put in `SSO_CLIENT_ID`
- a redirect URI of `<your app URL>/api/auth/callback/sso`

Users additionally need this app's slug granted to them — authenticating successfully is not sufficient, and a user without the grant lands on `/403`.

## How it works

Clicking **Continue with SSO** runs the OAuth2 Authorization Code flow:

1. NextAuth redirects to `SSO_URL/api/oauth/authorize`
2. The user authenticates on the SSO server (or is already signed in)
3. The SSO server checks whether the user is permitted to use `SSO_CLIENT_ID`
4. It issues a code and redirects back to `/api/auth/callback/sso`
5. NextAuth exchanges the code at `/api/oauth/token`, reads `/api/oauth/userinfo`, and creates a local session

Authorization is then enforced in two independent places, both against the `apps[]` claim:

- **`src/proxy.ts`** — an edge guard that redirects unauthenticated requests to `/login` and authenticated-but-unpermitted ones to `/403`
- **`src/app/page.tsx`** — recomputes access itself and renders a denial banner rather than trusting the guard

In Next.js 16 middleware is named `proxy.ts`; that file is this project's middleware.

## Layout

```
src/
  proxy.ts                        route guard (Next 16 middleware)
  lib/auth.ts                     NextAuth config: SSO provider, cookies, callbacks
  types/next-auth.d.ts            module augmentation for the role/apps claims
  app/
    page.tsx                      dashboard (protected)
    login/page.tsx                SSO sign-in
    403/page.tsx                  authenticated but not permitted
    api/auth/[...nextauth]/       NextAuth route handlers
    globals.css                   design tokens + Tailwind v4 theme
  components/
    app-shell.tsx                 navbar + sidebar + footer, responsive drawer
    theme-toggle.tsx              light/dark toggle
    icons.tsx
```

## Customizing

**Renaming the app.** Set `APP_NAME` — it flows to every page. Every read of it uses a `?? "SSO Client"` fallback; keep that fallback if you add new reads, since an unguarded `process.env.APP_NAME!` renders `undefined` and crashes on `.charAt(0)`.

**Changing `SSO_CLIENT_ID`.** This is the app's identity, its permission key, *and* its cookie prefix. Changing it invalidates every existing session and requires a matching registration on the SSO server.

**Styling.** Tailwind v4 with no `tailwind.config.js`. The palette is CSS custom properties in `src/app/globals.css` exposed via `@theme inline`. Use semantic classes (`bg-card`, `text-muted-foreground`, `border-border`) instead of raw color scales and dark mode works automatically.

**Adding a claim.** Custom claims are threaded through `profile()` and the `jwt`/`session` callbacks in `src/lib/auth.ts`, plus the module augmentation in `src/types/next-auth.d.ts`. All three need updating together.

**Adding a public route.** `src/proxy.ts` carries both a `config.matcher` regex and an in-body `PUBLIC_PREFIXES` list. Update both.

## Checks

```bash
npx tsc --noEmit
pnpm build
```

There is no test suite and no ESLint config in this template — type-checking is the only verification step out of the box.

## Troubleshooting

**`JWTSessionError` / "no matching decryption secret"** — Two apps are sharing cookies. In dev, the SSO server and every client app sit on `localhost` and receive each other's cookies, so all cookie names here are prefixed with `SSO_CLIENT_ID` to keep them isolated. Check that this app's `SSO_CLIENT_ID` is unique and that `AUTH_SECRET` differs from the SSO server's.

**Hot reload silently stops working** — You're reaching `next dev` through a proxy hostname rather than localhost, so `/_next/*` requests are cross-origin and Next blocks them. Add the hostname to `ALLOWED_DEV_ORIGINS` (comma-separated) and restart. Note that a leading `*.` matches **exactly one label**, so `*.example.com` does not cover the bare `example.com` — list the apex separately if you also reach the app through a path-based proxy.

**Redirected to `/403` after a successful sign-in** — Authentication worked but the user has not been granted this app's slug on the SSO server.

**OAuth callback never returns** — `AUTH_URL` must include the `/api/auth` suffix and point at the port you're actually serving on. The `dev` script's hardcoded 3001 is a common mismatch.

**Token exchange fails** — PKCE is deliberately disabled (`checks: ["state"]` in `src/lib/auth.ts`) because the SSO token endpoint authenticates with `client_secret_post`, not `code_verifier`. NextAuth v5 turns PKCE on by default; re-enabling it breaks the exchange unless the SSO server is changed to match.
