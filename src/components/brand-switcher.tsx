"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setBrand } from "@/app/actions/brand";
import { BRANDS, BRAND_LABELS, type Brand } from "@/lib/brand";

export function BrandSwitcher({ brand }: { brand: Brand }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSwitch(next: Brand) {
    if (next === brand || isPending) return;
    startTransition(async () => {
      await setBrand(next);
      router.refresh();
    });
  }

  return (
    <div className="brand-switcher inline-flex items-center gap-0.5 rounded-lg p-0.5">
      {BRANDS.map((key) => (
        <Button
          key={key}
          type="button"
          size="sm"
          variant={brand === key ? "default" : "ghost"}
          disabled={isPending}
          onClick={() => handleSwitch(key)}
          // LBsTransformation's active state is bg-primary/text-primary-foreground
          // (Iron Charcoal + white, both brand-scoped tokens set unconditionally
          // regardless of light/dark, globals.css), correct as-is: white text on
          // a dark background. LBsWorks used those same shared tokens too, which
          // meant white text on Build Indigo, a colored fill, not a genuine
          // reverse of the other brand's black/white pairing. Hardcoded here
          // instead of via --primary/--primary-foreground since those tokens
          // drive every other primary-styled button app-wide, not just this
          // one pill; twMerge (cn()) drops the conflicting bg-primary/
          // text-primary-foreground/hover:bg-primary-80 utilities from the
          // "default" variant in favor of these.
          className={
            brand === key && key === "lbsworks"
              ? "bg-white text-black hover:bg-white/90"
              : undefined
          }
        >
          {BRAND_LABELS[key]}
        </Button>
      ))}
    </div>
  );
}
