"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// docs/topic-page-redesign.md Section 6: dark/light toggle. globals.css
// already had the full .dark token set defined (Phase G work), nothing
// ever applied the class, this is that missing piece.
//
// useSyncExternalStore, not useState+useEffect: the .dark class lives
// outside React (toggled here, or set once before hydration by the
// inline script in src/app/layout.tsx), and setting state synchronously
// in an effect on mount is a real lint error in this codebase
// (react-hooks/set-state-in-effect), not just a style preference. This
// is exactly the case the hook exists for, and its getServerSnapshot
// param means the SSR/hydration mismatch (server never knows the real
// preference) is handled correctly for free.
const listeners = new Set<() => void>();

function subscribeToTheme(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerThemeSnapshot() {
  return false;
}

function setTheme(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  localStorage.setItem("theme", next ? "dark" : "light");
  listeners.forEach((listener) => listener());
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(!isDark)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
