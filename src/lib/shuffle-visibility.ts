// Streak & Goals follow-up: independent visibility preferences for the
// three elements in the top bar's streak/goals row (Walk streak,
// Posting streak, and the rotating platform-goal shuffle), not data
// changes, nothing about goals or streaks themselves is touched. Same
// localStorage-backed useSyncExternalStore pattern as theme-toggle.tsx
// and audience-graphs-panel.tsx's split, for the same reason: this
// needs to read outside React on the server (no localStorage there) and
// sync correctly on hydration without tripping the
// react-hooks/set-state-in-effect lint rule. Three independent toggles,
// not one shared factory instance, each with its own storage key and
// listener set so hiding one never affects the others.
function createVisibilityToggle(storageKey: string) {
  const listeners = new Set<() => void>();

  return {
    subscribe(callback: () => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getSnapshot(): boolean {
      return localStorage.getItem(storageKey) !== "false";
    },
    getServerSnapshot(): boolean {
      return true;
    },
    set(next: boolean) {
      localStorage.setItem(storageKey, String(next));
      listeners.forEach((listener) => listener());
    },
  };
}

export const shuffleVisibility = createVisibilityToggle("topbar-shuffle-visible");
export const walkStreakVisibility = createVisibilityToggle("topbar-walk-streak-visible");
export const postStreakVisibility = createVisibilityToggle("topbar-post-streak-visible");
