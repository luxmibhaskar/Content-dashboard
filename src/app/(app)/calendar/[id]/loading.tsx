// Section 17.4's "retrieving..." moment: a brief wait when opening an
// archived item is expected, not a bug, this keeps that from looking
// broken while the real page (and its archive retrieval, if any) loads.
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted-foreground">
      Loading, retrieving archived detail if this item was archived...
    </div>
  );
}
