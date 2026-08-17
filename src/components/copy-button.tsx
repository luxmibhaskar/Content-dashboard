"use client";

import { useState } from "react";

export function CopyButton({
  targetId,
  transform = "raw",
  label = "Copy",
}: {
  targetId: string;
  transform?: "raw" | "commaJoin";
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const el = document.getElementById(targetId) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (!el) return;

    const text =
      transform === "commaJoin"
        ? el.value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .join(", ")
        : el.value;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
