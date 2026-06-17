/**
 * NextAuth configuration for Web A.
 *
 * This app is an OAuth2 client of the central SSO server.
 * It does NOT store passwords — authentication always goes through
 * http://localhost:3000 (SSO server).
 *
 * Required env vars (.env.local):
 *   SSO_URL            — e.g. http://localhost:3000
 *   SSO_CLIENT_ID      — app slug for this client
 *   SSO_CLIENT_SECRET  — from `pnpm prisma db seed`
 *   AUTH_SECRET        — random secret unique to this app
 *   NEXTAUTH_URL       — http://localhost:3001
 */
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

const SSO_URL   = process.env.SSO_URL!;
const CLIENT_ID = process.env.SSO_CLIENT_ID!;

/**
 * Unique cookie names for this client app.
 *
 * All client apps and the SSO server share the `localhost` domain in dev,
 * so they all receive each other's cookies. Without unique names every app
 * tries to decrypt the SSO server's `authjs.session-token` with its own
 * AUTH_SECRET → "no matching decryption secret" / JWTSessionError.
 *
 * Giving each app its own prefix keeps the cookies isolated.
 */
const COOKIE_PREFIX = process.env.SSO_CLIENT_ID!;
const secure        = process.env.NODE_ENV === "production";

export const authConfig: NextAuthConfig = {
  cookies: {
    sessionToken: {
      name: `${COOKIE_PREFIX}.session-token`,
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure },
    },
    callbackUrl: {
      name: `${COOKIE_PREFIX}.callback-url`,
      options: { sameSite: "lax" as const, path: "/", secure },
    },
    csrfToken: {
      name: `${COOKIE_PREFIX}.csrf-token`,
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure },
    },
    pkceCodeVerifier: {
      name: `${COOKIE_PREFIX}.pkce.code_verifier`,
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure },
    },
    state: {
      name: `${COOKIE_PREFIX}.state`,
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure },
    },
    nonce: {
      name: `${COOKIE_PREFIX}.nonce`,
      options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure },
    },
  },

  providers: [
    {
      id:   "sso",
      name: "SSO",
      type: "oauth" as const,

      // Disable PKCE — our SSO token endpoint authenticates with client_secret,
      // not code_verifier. PKCE is on by default in NextAuth v5; turning it off
      // means the authorize request will NOT include code_challenge, and the
      // token request will include client_secret as expected.
      checks: ["state"] as ["state"],

      // ── SSO server endpoints ──────────────────────────────────────────
      authorization: {
        url:    `${SSO_URL}/api/oauth/authorize`,
        params: { client_id: CLIENT_ID, scope: "openid" },
      },
      token:    `${SSO_URL}/api/oauth/token`,
      userinfo: `${SSO_URL}/api/oauth/userinfo`,

      clientId:     CLIENT_ID,
      clientSecret: process.env.SSO_CLIENT_SECRET!,
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },

      // Map the userinfo response into a next-auth User object
      profile(profile: Record<string, unknown>) {
        return {
          id:    profile.sub  as string,
          name:  profile.name as string | null,
          email: profile.email as string | null,
          image: (profile.image as string | null) ?? null,
          role:  profile.role,
          apps:  profile.apps,
        };
      },
    },
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // profile is the raw userinfo payload — cast through unknown to access
        // custom claims (sub, role, apps) that NextAuth's Profile type doesn't declare
        const p = profile as unknown as Record<string, unknown>;
        token.id   = (p.sub ?? p.id) as string;
        token.role = p.role          as string;
        token.apps = p.apps          as string[];
      }
      return token;
    },

    async session({ session, token }) {
      // session.user already has id / role / apps from the type augmentation
      // in src/types/next-auth.d.ts — use direct assignment, no cast needed
      session.user.id   = token.id   as string;
      session.user.role = token.role as string;
      session.user.apps = (token.apps as string[]) ?? [];
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
