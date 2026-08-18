export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      data-collapsible-section
      open={defaultOpen}
      className="group overflow-hidden rounded-lg border border-border"
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium select-none marker:hidden transition-colors duration-150 ease-out hover:bg-muted active:bg-muted/80">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90">
          &rsaquo;
        </span>
        {title}
      </summary>
      <div className="space-y-4 border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}
