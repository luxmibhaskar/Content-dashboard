import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/collapsible-section";
import type { TextVariant, ThumbnailVariant } from "@/lib/types";
import {
  addTitleVariant,
  addHookVariant,
  addThumbnailVariant,
  useTitleVariant,
  useHookVariant,
  useThumbnailVariant,
  deleteTitleVariant,
  deleteHookVariant,
  deleteThumbnailVariant,
} from "@/app/(app)/calendar/[id]/variant-actions";

function VariantBadge({ source, isLive }: { source: string; isLive: boolean }) {
  return (
    <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      {source}
      {isLive && (
        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-emerald-700">Live</span>
      )}
    </span>
  );
}

function TextVariantList({
  contentId,
  variants,
  label,
  useAction,
  deleteAction,
  addAction,
}: {
  contentId: string;
  variants: TextVariant[];
  label: string;
  useAction: (contentId: string, variantId: string, variantText: string) => Promise<void>;
  deleteAction: (contentId: string, variantId: string) => Promise<void>;
  addAction: (contentId: string, formData: FormData) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      {variants.length === 0 && (
        <p className="text-sm text-muted-foreground">No {label.toLowerCase()} options yet.</p>
      )}
      <div className="space-y-2">
        {variants.map((v) => (
          <div
            key={v.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border p-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm">{v.variant_text}</p>
              <VariantBadge source={v.source} isLive={v.is_live} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!v.is_live && (
                <form action={useAction.bind(null, contentId, v.id, v.variant_text)}>
                  <Button type="submit" size="xs" variant="outline">
                    Use This
                  </Button>
                </form>
              )}
              <form action={deleteAction.bind(null, contentId, v.id)}>
                <button
                  type="submit"
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
      <form action={addAction.bind(null, contentId)} className="flex gap-2">
        <Input name="variant_text" placeholder={`Add a custom ${label.toLowerCase()}...`} />
        <Button type="submit" size="sm" variant="outline">
          Add
        </Button>
      </form>
    </div>
  );
}

function ThumbnailVariantList({
  contentId,
  variants,
}: {
  contentId: string;
  variants: ThumbnailVariant[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Thumbnail</p>
      {variants.length === 0 && (
        <p className="text-sm text-muted-foreground">No thumbnail concepts yet.</p>
      )}
      <div className="space-y-2">
        {variants.map((v) => (
          <div key={v.id} className="rounded-md border border-border p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{v.concept || "Untitled concept"}</p>
                {v.main_text_on_image && (
                  <p className="text-xs text-muted-foreground">
                    Text on image: {v.main_text_on_image}
                  </p>
                )}
                {v.visual_elements && (
                  <p className="text-xs text-muted-foreground">Visuals: {v.visual_elements}</p>
                )}
                {v.emotion_vibe && (
                  <p className="text-xs text-muted-foreground">Vibe: {v.emotion_vibe}</p>
                )}
                <VariantBadge source={v.source} isLive={v.is_live} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!v.is_live && (
                  <form action={useThumbnailVariant.bind(null, contentId, v.id)}>
                    <Button type="submit" size="xs" variant="outline">
                      Use This
                    </Button>
                  </form>
                )}
                <form action={deleteThumbnailVariant.bind(null, contentId, v.id)}>
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
      <form action={addThumbnailVariant.bind(null, contentId)} className="grid grid-cols-2 gap-2">
        <Input name="concept" placeholder="Concept" />
        <Input name="main_text_on_image" placeholder="Main text on image" />
        <Input name="visual_elements" placeholder="Visual elements" />
        <Input name="emotion_vibe" placeholder="Emotion / vibe" />
        <Button type="submit" size="sm" variant="outline" className="col-span-2">
          Add thumbnail concept
        </Button>
      </form>
    </div>
  );
}

export function ResearchOutputSection({
  contentId,
  titleVariants,
  hookVariants,
  thumbnailVariants,
}: {
  contentId: string;
  titleVariants: TextVariant[];
  hookVariants: TextVariant[];
  thumbnailVariants: ThumbnailVariant[];
}) {
  const hasVariants =
    titleVariants.length > 0 || hookVariants.length > 0 || thumbnailVariants.length > 0;

  return (
    <CollapsibleSection title="Research Output" defaultOpen={hasVariants}>
      <p className="text-xs text-muted-foreground">
        Research-based suggestions land here automatically once Phase 2&apos;s research
        automation exists. For now, add your own Custom options and mark one &quot;Use
        This&quot; per type, that&apos;s what feeds the Copy-Ready panel and the Hook Library.
      </p>
      <TextVariantList
        contentId={contentId}
        variants={titleVariants}
        label="Title"
        useAction={useTitleVariant}
        deleteAction={deleteTitleVariant}
        addAction={addTitleVariant}
      />
      <TextVariantList
        contentId={contentId}
        variants={hookVariants}
        label="Hook"
        useAction={useHookVariant}
        deleteAction={deleteHookVariant}
        addAction={addHookVariant}
      />
      <ThumbnailVariantList contentId={contentId} variants={thumbnailVariants} />
    </CollapsibleSection>
  );
}
