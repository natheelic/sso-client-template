/**
 * Dashboard — {APP_NAME}
 *
 * Server component: reads the session from the local NextAuth cookie
 * (populated via the SSO OAuth2 flow) and renders the user's profile + RBAC
 * claims inside the responsive AppShell.
 */
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { BanIcon, CheckIcon } from "@/components/icons";

const APP_NAME = process.env.APP_NAME!;
const APP_SLUG = process.env.SSO_CLIENT_ID!;
const SSO_URL = process.env.SSO_URL ?? "http://localhost:3000";

const CARD = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6";

export default async function DashboardPage() {
  const session = await auth();

  // Middleware (proxy.ts) should already guard this, but be defensive.
  if (!session?.user) redirect("/login");

  const user = session.user as {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
    apps: string[];
  };

  const hasAccess = user.apps.includes(APP_SLUG);
  const firstName =
    (user.name ?? user.email ?? "there").split("@")[0].split(" ")[0] || "there";

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AppShell
      user={{ name: user.name, email: user.email, image: user.image, role: user.role }}
      appName={APP_NAME}
      ssoUrl={SSO_URL}
      signOutAction={handleSignOut}
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* ── Page header ──────────────────────────────────────────── */}
        <header id="overview" className="mb-6 scroll-mt-20 sm:mb-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {APP_NAME}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back, <span className="font-medium text-foreground">{firstName}</span>.
            Here&apos;s your account overview.
          </p>
        </header>

        {/* ── Access warning (only when denied) ────────────────────── */}
        {!hasAccess && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <BanIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              You&apos;re signed in but not permitted to use <strong>{APP_NAME}</strong>.
              Please contact your administrator.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          {/* ── Profile (full width) ───────────────────────────────── */}
          <section id="profile" className={`${CARD} scroll-mt-20 lg:col-span-2`}>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {user.image ? (
                <Image
                  src={user.image}
                  alt="avatar"
                  width={56}
                  height={56}
                  className="shrink-0 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div
                  aria-hidden
                  className="grid shrink-0 place-items-center rounded-full bg-secondary text-xl font-bold text-secondary-foreground ring-2 ring-border"
                  style={{ width: 56, height: 56 }}
                >
                  {(user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase() || "?"}
                </div>
              )}

              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold">{user.name ?? "(no name)"}</h2>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>

              <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground sm:ml-auto">
                {user.role}
              </span>
            </div>

            <div className="mt-4 break-all border-t border-border pt-4 text-xs text-muted-foreground/70">
              User ID: {user.id}
            </div>
          </section>

          {/* ── Access & Role ──────────────────────────────────────── */}
          <section id="access" className={`${CARD} scroll-mt-20`}>
            <h3 className="text-sm font-semibold text-muted-foreground">Access &amp; Role</h3>
            <dl className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted-foreground">Role</dt>
                <dd>
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {user.role}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted-foreground">Access to {APP_NAME}</dt>
                <dd>
                  {hasAccess ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                      <CheckIcon className="h-3.5 w-3.5" /> Permitted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                      <BanIcon className="h-3.5 w-3.5" /> Denied
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* ── Permitted applications ─────────────────────────────── */}
          <section id="applications" className={`${CARD} scroll-mt-20`}>
            <h3 className="text-sm font-semibold text-muted-foreground">
              Permitted Applications
            </h3>
            {user.apps.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No apps assigned.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {user.apps.map((slug) => (
                  <span
                    key={slug}
                    className={
                      "rounded-md border px-2.5 py-1 text-xs font-medium " +
                      (slug === APP_SLUG
                        ? "border-primary/30 bg-primary/10 text-foreground"
                        : "border-border bg-secondary text-secondary-foreground")
                    }
                  >
                    {slug === APP_SLUG ? APP_NAME : slug}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
