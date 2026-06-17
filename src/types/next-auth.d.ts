import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id:   string;
      role: string;
      /** App slugs this user is permitted to access, from the SSO token */
      apps: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:   string;
    role: string;
    apps: string[];
  }
}
