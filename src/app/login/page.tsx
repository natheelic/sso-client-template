/**
 * Login page — {APP_NAME}
 *
 * Clicking "Continue with SSO" triggers the OAuth2 Authorization Code flow:
 *   1. NextAuth redirects to SSO server /api/oauth/authorize
 *   2. User authenticates (or is already logged in) on the SSO server
 *   3. SSO checks UserAppPermission for this app's SSO_CLIENT_ID
 *   4. SSO issues a code and redirects back to /api/auth/callback/sso
 *   5. NextAuth exchanges code for token, creates local session
 */
import { signIn } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const APP_NAME = process.env.APP_NAME ?? "Web A";
const SSO_URL = process.env.SSO_URL ?? "http://localhost:3000";

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
        {/* Brand */}
        <span className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
            {APP_NAME.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
        </span>

        {/* Heading */}
        <div className="space-y-1.5 text-center">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;ll be redirected to the central SSO server to authenticate.
          </p>
        </div>

        {/* SSO sign-in button */}
        <form
          className="w-full"
          action={async () => {
            "use server";
            await signIn("sso", { redirectTo: callbackUrl ?? "/" });
          }}
        >
          <button
            type="submit"
            className="flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Continue with SSO →
          </button>
        </form>

        <a
          href={SSO_URL}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Powered by the central SSO server
        </a>
      </div>
    </main>
  );
}
