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
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
      {BRANDS.map((key) => (
        <Button
          key={key}
          type="button"
          size="sm"
          variant={brand === key ? "default" : "ghost"}
          disabled={isPending}
          onClick={() => handleSwitch(key)}
        >
          {BRAND_LABELS[key]}
        </Button>
      ))}
    </div>
  );
}
