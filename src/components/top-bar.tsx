import { Button } from "@/components/ui/button";
import { BrandSwitcher } from "@/components/brand-switcher";
import { signOut } from "@/app/actions/auth";
import type { Brand } from "@/lib/brand";

export function TopBar({
  brand,
  userEmail,
}: {
  brand: Brand;
  userEmail: string | null;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <BrandSwitcher brand={brand} />
      <div className="flex items-center gap-3">
        {userEmail && (
          <span className="text-sm text-muted-foreground">{userEmail}</span>
        )}
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
