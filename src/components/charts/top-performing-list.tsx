"use client";

import { BarList } from "@tremor/react";
import type { TopContentItem } from "@/lib/analytics";

// Section 6.4 asks for "a table with thumbnails" - there's no image
// asset tracked anywhere in the schema (thumbnail_variants stores text
// concept fields, not an uploaded image), so this stays text-only,
// title links straight to the topic page instead.
export function TopPerformingList({ items }: { items: TopContentItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing published with tracked views in this range yet.</p>;
  }

  return (
    <BarList
      data={items.map((item) => ({
        name: item.final_title,
        value: item.views,
        href: `/calendar/${item.id}`,
      }))}
      valueFormatter={(v: number) => v.toLocaleString()}
    />
  );
}
