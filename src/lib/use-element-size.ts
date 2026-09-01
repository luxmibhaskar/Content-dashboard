import { useEffect, useState, type RefObject } from "react";

// Top bar rebuild: the adaptive bar measures its own columns at runtime
// (docs/dashboard-redesign.md "Layout follow-ups"). Both hooks keep every
// setState inside an async ResizeObserver / fonts callback, never in the
// effect body, so they stay clear of the repo-wide
// react-hooks/set-state-in-effect rule the same way theme-toggle.tsx and
// shuffle-visibility.ts do with useSyncExternalStore.

/**
 * Content-box width of `ref`'s element, tracked via ResizeObserver.
 * `null` until the first observation, so server render / first paint fall
 * back to an "everything expanded" layout.
 */
export function useElementWidth<T extends HTMLElement>(ref: RefObject<T | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

/**
 * Widths of every `[data-measure]` descendant of `ref`, keyed by that
 * attribute's value. Re-reads when the container or any direct child
 * resizes, when `signature` changes (a measured node was added or
 * removed), and once web fonts finish loading. Returns `{}` until the
 * first read.
 */
export function useMeasuredWidths<T extends HTMLElement>(
  ref: RefObject<T | null>,
  signature: string,
): Record<string, number> {
  const [widths, setWidths] = useState<Record<string, number>>({});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const read = () => {
      const next: Record<string, number> = {};
      el.querySelectorAll<HTMLElement>("[data-measure]").forEach((node) => {
        const key = node.dataset.measure;
        if (key) next[key] = node.getBoundingClientRect().width;
      });
      setWidths((prev) => {
        const keys = Object.keys(next);
        if (keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k])) {
          return prev;
        }
        return next;
      });
    };

    // observe() queues an initial callback with the current size, so the
    // first read happens off the effect body, not in it.
    const observer = new ResizeObserver(read);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));

    let cancelled = false;
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready
        .then(() => {
          if (!cancelled) read();
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [ref, signature]);

  return widths;
}
