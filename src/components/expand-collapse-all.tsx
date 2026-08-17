"use client";

import { Button } from "@/components/ui/button";

export function ExpandCollapseAll() {
  function setAll(open: boolean) {
    document
      .querySelectorAll<HTMLDetailsElement>("[data-collapsible-section]")
      .forEach((el) => {
        el.open = open;
      });
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={() => setAll(true)}>
        Expand all
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setAll(false)}>
        Collapse all
      </Button>
    </div>
  );
}
