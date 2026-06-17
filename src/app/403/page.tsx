/**
 * 403 Forbidden — {APP_NAME}
 *
 * Shown when the authenticated user's token does not include this app's
 * SSO_CLIENT_ID in the apps[] claim, meaning the SSO admin has not granted
 * them access.
 */
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const APP_NAME = process.env.APP_NAME ?? "Web A";
const SSO_URL = process.env.SSO_URL ?? "http://localhost:3000";

export default async function ForbiddenPage() {
  const session = await auth();
  const user = session?.user as { email?: string | null; name?: string | null } | undefined;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {/* Icon */}
      <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-destructive/30 bg-destructive/10 text-4xl select-none">
        🚫
      </div>

      {/* Message */}
      <div className="max-w-sm space-y-2">
        <div className="text-5xl font-extrabold leading-none text-foreground sm:text-6xl">403</div>
        <div className="text-xl font-semibold text-foreground">Access Forbidden</div>
        {user?.email ? (
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{user.email}</span> does not have
            permission to access <strong>{APP_NAME}</strong>. Contact your administrator.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to access this application.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-sm flex-col justify-center gap-3 sm:w-auto sm:flex-row">
        <a
          href="/"
          className="flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground no-underline transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Go Home
        </a>

        {user && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="flex min-h-11 w-full items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Sign out
            </button>
          </form>
        )}
      </div>

      <a
        href={SSO_URL}
        className="text-xs text-muted-foreground no-underline transition-colors hover:text-foreground"
      >
        ← Back to SSO Server
      </a>
    </main>
  );
}
