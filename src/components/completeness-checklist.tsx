"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChecklistItem } from "@/lib/types";

export function CompletenessChecklist({
  name,
  initialItems,
}: {
  name: string;
  initialItems: ChecklistItem[];
}) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [draft, setDraft] = useState("");

  function addItem() {
    const label = draft.trim();
    if (!label) return;
    setItems((prev) => [...prev, { label, checked: false }]);
    setDraft("");
  }

  function toggleItem(index: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item)),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(index)}
              className="size-4 rounded border-input"
            />
            <span className="flex-1 text-sm">{item.label}</span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">No angles added yet.</li>
        )}
      </ul>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a specific angle this topic needs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          Add
        </Button>
      </div>
    </div>
  );
}
