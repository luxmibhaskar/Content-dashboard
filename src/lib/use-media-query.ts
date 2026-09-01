import { useSyncExternalStore } from "react";

// Top bar Streak and Goals toggle (docs/dashboard-redesign.md "Layout
// follow-ups"): the toggle's default state is breakpoint-dependent, so it
// needs a live breakpoint read. matchMedia via useSyncExternalStore, the
// same server-safe pattern as theme-toggle.tsx and shuffle-visibility.ts.
//
// The server snapshot always returns true, i.e. it assumes the largest
// layout (desktop), so the common case hydrates without a flash and a
// smaller screen corrects on the first client render. Only pass
// min-width queries here, a max-width query would want the opposite
// default.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}
