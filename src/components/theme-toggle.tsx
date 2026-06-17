"use client";

/**
 * Light / dark theme toggle.
 *
 * Reads the initial state from the `.dark` class that the inline script in
 * `layout.tsx` applies before paint (so there's no flash), then persists the
 * user's choice to `localStorage` and toggles the class on <html>.
 *
 * A mount guard renders a neutral placeholder on the server / first client
 * render so the icon never causes a hydration mismatch.
 */
import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* localStorage may be unavailable (private mode) — ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mounted ? `Switch to ${dark ? "light" : "dark"} theme` : "Toggle theme"}
      title="Toggle theme"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      {mounted ? (
        dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />
      ) : (
        <span className="h-5 w-5" />
      )}
    </button>
  );
}
