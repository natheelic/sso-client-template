"use client";

/**
 * Responsive application shell: sticky navbar + sidebar + footer.
 *
 * Layout behaviour
 *  - ≥ lg (1024px): the sidebar is a persistent, sticky column beside the
 *    content; the navbar hamburger is hidden.
 *  - < lg: the sidebar collapses into an off-canvas drawer opened from the
 *    navbar hamburger, with a dimmed backdrop, body-scroll lock, Escape-to-
 *    close, and auto-close on navigation or when the viewport grows to lg.
 *
 * The active nav item is tracked with an IntersectionObserver scroll-spy over
 * the dashboard sections (the `href` anchors map to element ids on the page).
 *
 * `signOutAction` is a Server Action passed down from the dashboard page and
 * wired to a <form>, so sign-out keeps working without shipping auth logic to
 * the client.
 */
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import {
  AppsIcon,
  CloseIcon,
  ExternalLinkIcon,
  GridIcon,
  LogOutIcon,
  MenuIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

type ShellUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
};

type Props = {
  user: ShellUser;
  appName: string;
  ssoUrl: string;
  signOutAction: () => Promise<void>;
  children: ReactNode;
};

const NAV = [
  { id: "overview", label: "Overview", Icon: GridIcon },
  { id: "profile", label: "Profile", Icon: UserIcon },
  { id: "access", label: "Access & Role", Icon: ShieldIcon },
  { id: "applications", label: "Applications", Icon: AppsIcon },
] as const;

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

function Avatar({ user, size }: { user: ShellUser; size: number }) {
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground ring-1 ring-border"
      style={{ width: size, height: size }}
    >
      {(user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

export function AppShell({ user, appName, ssoUrl, signOutAction, children }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>(NAV[0].id);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the drawer on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Auto-close the drawer when the viewport grows to the lg breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Scroll-spy: highlight the nav item for the section currently in view.
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const brand = (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        {appName.charAt(0).toUpperCase()}
      </span>
      <span className="truncate text-sm font-semibold tracking-tight">{appName}</span>
    </span>
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="app-sidebar"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">{brand}</div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="#profile"
            aria-label="View your profile"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Avatar user={user} size={36} />
          </a>
        </div>
      </header>

      {/* ── Body: sidebar + content ──────────────────────────────────── */}
      <div className="flex flex-1">
        {/* Backdrop (mobile only, when drawer is open) */}
        {open && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Sidebar / drawer */}
        <aside
          id="app-sidebar"
          aria-label="Primary"
          className={cx(
            "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82%] flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out",
            open ? "translate-x-0" : "-translate-x-full",
            "lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100dvh_-_4rem)] lg:w-64 lg:max-w-none lg:translate-x-0 lg:self-start lg:transition-none",
          )}
        >
          {/* Drawer header (mobile only) */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
            {brand}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto p-3">
            <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Menu
            </p>
            <ul className="space-y-1">
              {NAV.map(({ id, label, Icon }) => {
                const isActive = active === id;
                return (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => setOpen(false)}
                      className={cx(
                        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="truncate">{label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="my-3 border-t border-border" />

            <a
              href={ssoUrl}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              <ExternalLinkIcon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">SSO Server</span>
            </a>
          </nav>

          {/* User panel + sign out (pinned to bottom) */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <Avatar user={user} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name ?? "(no name)"}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <form action={signOutAction} className="mt-1">
              <button
                type="submit"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <LogOutIcon className="h-[18px] w-[18px]" />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        {/* Content + footer column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1">{children}</main>

          {/* ── Footer ─────────────────────────────────────────────── */}
          <footer className="border-t border-border">
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
              <p className="text-center sm:text-left">
                © {new Date().getFullYear()} {appName}. Secured by the central SSO server.
              </p>
              <div className="flex items-center gap-4">
                <a href={ssoUrl} className="transition-colors hover:text-foreground">
                  SSO Server
                </a>
                <span className="text-muted-foreground/50">v0.1.0</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
