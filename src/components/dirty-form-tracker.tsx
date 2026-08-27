"use client";

import { useEffect } from "react";
import { useUnsavedChanges } from "@/lib/unsaved-changes-context";

// Marks the shared unsaved-changes flag dirty on any change inside this
// form (native inputs/selects only, plain DOM change-event bubbling, no
// Radix controls in the topic page's main form) and clears it the moment
// Save is clicked - "touched since load or last save," not "confirmed
// saved by the server," matching this app's existing pattern of trusting
// an explicit Save action rather than tracking request success/failure.
// Render with key={contentId} at the call site so navigating between two
// topic pages in-app (no full unload, same route template) remounts this
// and resets the flag instead of leaking dirty state from one item to
// the next.
export function DirtyFormTracker({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  const { dirty, setDirty } = useUnsavedChanges();

  useEffect(() => {
    return () => setDirty(false);
  }, [setDirty]);

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return (
    <form
      action={action}
      className={className}
      onChange={() => setDirty(true)}
      onSubmit={() => setDirty(false)}
    >
      {children}
    </form>
  );
}
