"use client";

import { createContext, useContext, useState } from "react";

// Topic-page "unsaved changes" protection: a lighter alternative to full
// dirty-state tracking (see chat, 2026-08-27) - just "has the current
// topic page's main form been touched since load or last save," shared
// via context so BrandSwitcher (rendered in TopBar, a sibling of the
// page content in (app)/layout.tsx) can read it without prop-drilling.
type UnsavedChangesContextValue = {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [dirty, setDirty] = useState(false);
  return (
    <UnsavedChangesContext.Provider value={{ dirty, setDirty }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider");
  }
  return ctx;
}
