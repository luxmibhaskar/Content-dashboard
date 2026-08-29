import Link from "next/link";
import { cn } from "@/lib/utils";

// Extracted from the Analytics view toggle (content | platforms), which
// was the one place in the app already drawing a real segmented control:
// a bordered pill container with the selected option filled, the rest
// transparent. Reused now for Content Calendar's Long Form / Short Form
// so "which is selected" reads as a proper toggle in both places rather
// than two pills that happen to differ in fill.
//
// Plain server component (only renders <Link>s), so RSC pages can use it
// directly. Each option carries its own precomputed href; the caller
// owns building those (preserving whatever other query params it wants).
export function SegmentedToggle({
  options,
  value,
  ariaLabel,
  className,
}: {
  options: { value: string; label: string; href: string }[];
  value: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Link
            key={opt.value}
            href={opt.href}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
