import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandSwitcher } from "@/components/brand-switcher";
import { signOut } from "@/app/actions/auth";
import type { Brand } from "@/lib/brand";

const NAV_LINKS = [
  { href: "/", label: "Today" },
  { href: "/calendar", label: "Content Calendar" },
  { href: "/journey", label: "My Journey Log" },
];

export function TopBar({
  brand,
  userEmail,
}: {
  brand: Brand;
  userEmail: string | null;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
      <div className="flex items-center gap-6">
        <BrandSwitcher brand={brand} />
        <nav className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
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
