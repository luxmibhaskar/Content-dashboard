"use client";

import { useEffect } from "react";
import { useUnsavedChanges } from "@/lib/unsaved-changes-context";

// Tracks "touched since load or last save" for one logical <form> (by id)
// that isn't a single contiguous DOM subtree - Reference Videos and the
// Analytics and Conversion section's Conversions field both need to sit
// between/alongside the topic page's own fields without ever nesting
// inside their <form> (Reference Videos has its own Add/Remove/Save
// notes forms; nested <form> elements are invalid HTML and a nested
// form's own submit button would silently target the wrong one). Those
// fields instead use the native form="<id>" attribute to stay part of
// the one atomic Save while living elsewhere in the DOM, so dirty-
// detection here can't rely on DOM containment (a plain onChange on the
// <form> element itself would miss them) - it filters by the changed
// element's owning form (the native .form property, which correctly
// resolves through the form="" attribute regardless of DOM position)
// instead, on a wrapper that can safely surround unrelated forms
// (PlatformAnalyticsSection's "Log a check-in", Reference Videos' own)
// too, since only elements owned by `formId` ever mark this dirty.
//
// Render with key={contentId} at the call site so navigating between two
// topic pages in-app (no full unload, same route template) remounts this
// and resets the flag instead of leaking dirty state from one item to
// the next.
export function DirtyFormRegion({
  formId,
  children,
}: {
  formId: string;
  children: React.ReactNode;
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

  function isOwnedByTrackedForm(target: EventTarget | null) {
    const el = target as { form?: HTMLFormElement | null } | null;
    return el?.form?.id === formId;
  }

  return (
    <div
      onChange={(e) => {
        if (isOwnedByTrackedForm(e.target)) setDirty(true);
      }}
      onSubmit={(e) => {
        if ((e.target as HTMLFormElement).id === formId) setDirty(false);
      }}
    >
      {children}
    </div>
  );
}
