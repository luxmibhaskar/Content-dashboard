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
      className="group rounded-lg border border-border"
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium select-none marker:hidden">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90">
          &rsaquo;
        </span>
        {title}
      </summary>
      <div className="space-y-4 border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}
