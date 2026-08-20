// Streak & Goals follow-up item 1: a visibility preference for the
// top-bar's rotating platform-goal display (StreakGoalsBar's shuffle
// element), not a data change, nothing about goals or streaks
// themselves is touched. Same localStorage-backed useSyncExternalStore
// pattern as theme-toggle.tsx and audience-graphs-panel.tsx's split, for
// the same reason: this needs to read outside React on the server (no
// localStorage there) and sync correctly on hydration without tripping
// the react-hooks/set-state-in-effect lint rule.
const STORAGE_KEY = "topbar-shuffle-visible";

const listeners = new Set<() => void>();

export function subscribeToShuffleVisible(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getShuffleVisibleSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export function getServerShuffleVisibleSnapshot(): boolean {
  return true;
}

export function setShuffleVisible(next: boolean) {
  localStorage.setItem(STORAGE_KEY, String(next));
  listeners.forEach((listener) => listener());
}
