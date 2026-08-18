import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReferenceVideo, ResearchSnapshot } from "@/lib/types";
import { refreshResearch } from "../research-actions";
import { retrieveResearchSnapshot } from "@/lib/archive-lifecycle";
import { ReferenceVideosSection } from "@/components/reference-videos-section";

export default async function ResearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ snapshot?: string }>;
}) {
  const { id } = await params;
  const { snapshot: snapshotParam } = await searchParams;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("content_calendar")
    .select("id, brand, final_title, is_archived")
    .eq("id", id)
    .single();

  const { data: snapshots } = await supabase
    .from("research_snapshots")
    .select("id, content_id, snapshot_date, youtube_data, google_data, reddit_data, quora_data, summary")
    .eq("content_id", id)
    .order("snapshot_date", { ascending: false });

  const { data: referenceVideos } = await supabase
    .from("reference_videos")
    .select("id, content_id, url, hook_note, rehook_note, cta_note, date_added")
    .eq("content_id", id)
    .order("date_added", { ascending: false });

  const rows = (snapshots ?? []) as ResearchSnapshot[];
  let selected = snapshotParam ? rows.find((r) => r.id === snapshotParam) : rows[0];
  const isLatest = selected ? selected.id === rows[0]?.id : true;

  // Section 17.4, lazy per-snapshot: only the one snapshot actually
  // being viewed gets restored from Drive, not every historical pull
  // for this topic just because the page was opened. Gated on the
  // snapshot's own fields, not the parent item's is_archived flag,
  // that flag already flips back to false as soon as the content page
  // itself is opened, before any of its snapshots get retrieved.
  // youtube/reddit/quora_data are never null except after archiving
  // (a normal pull always leaves them at least []), so null there is
  // an unambiguous signal; google_data can also be null after a
  // same-day fetch failure, retrying in that case is a harmless no-op
  // since the companion would faithfully restore null right back.
  if (
    item &&
    selected &&
    (selected.youtube_data === null ||
      selected.google_data === null ||
      selected.reddit_data === null ||
      selected.quora_data === null)
  ) {
    await retrieveResearchSnapshot(supabase, selected.id, item.final_title || "Untitled", item.brand);
    const { data: refreshed } = await supabase
      .from("research_snapshots")
      .select("id, content_id, snapshot_date, youtube_data, google_data, reddit_data, quora_data, summary")
      .eq("id", selected.id)
      .single<ResearchSnapshot>();
    if (refreshed) selected = refreshed;
  }

  const boundRefresh = refreshResearch.bind(null, id);

  return (
    <div className="w-full px-4 py-10">
      <Link href={`/calendar/${id}`} className="text-sm text-muted-foreground hover:underline">
        &larr; {item?.final_title || "Content item"}
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Research</h1>
        <form action={boundRefresh}>
          <Button type="submit" size="sm">
            Refresh Research
          </Button>
        </form>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pulls YouTube (top 10 videos, view counts, description, top comments, no real
        transcripts, see note below), Google (autocomplete + People Also Ask + related
        searches), Reddit, and Quora. Reddit has no approved official API access, so it
        runs through the same site-scoped search as Quora rather than a dedicated
        integration. Refreshing never edits or deletes a prior pull, it appends a new
        dated snapshot. Each refresh uses about 4 SerpApi searches, worth keeping in mind
        against your plan's monthly allowance.
      </p>

      <ReferenceVideosSection contentId={id} videos={(referenceVideos ?? []) as ReferenceVideo[]} />

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No research pulled yet. Click Refresh Research above.
        </p>
      ) : (
        <>
          {rows.length > 1 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-muted-foreground">History</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {rows.map((r, i) => (
                  <Link
                    key={r.id}
                    href={i === 0 ? `/calendar/${id}/research` : `/calendar/${id}/research?snapshot=${r.id}`}
                    className={cn(
                      "rounded-md border border-border px-2.5 py-1 text-xs",
                      selected?.id === r.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {new Date(r.snapshot_date).toLocaleDateString()}
                    {i === 0 && " (latest)"}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {selected && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {isLatest ? "Potential Data" : "Past snapshot (read-only)"}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {new Date(selected.snapshot_date).toLocaleString()}
                </span>
              </div>
              {selected.summary && (
                <p className="mt-2 text-sm text-muted-foreground">{selected.summary}</p>
              )}

              <div className="mt-4 space-y-3">
                {(selected.youtube_data ?? []).map((v) => (
                  <div key={v.videoId} className="rounded-lg border border-border p-3">
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline"
                    >
                      {v.title}
                    </a>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {v.channelTitle}
                      {v.viewCount !== null && ` · ${v.viewCount.toLocaleString()} views`}
                      {" · "}
                      {new Date(v.publishedAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      No transcript, real captions need the channel owner's OAuth
                      consent, not accessible for other people's videos with an API
                      key alone. Title, description, and top comments are the actual
                      signal here.
                    </p>
                    {v.description && (
                      <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                        {v.description}
                      </p>
                    )}
                    {v.topComments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Top comments
                        </p>
                        {v.topComments.map((c, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {c}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(selected.youtube_data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No YouTube results in this pull.</p>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-medium text-muted-foreground">Google</h3>
                {selected.google_data ? (
                  <div className="mt-2 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Autocomplete</p>
                      {selected.google_data.autocomplete.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {selected.google_data.autocomplete.map((s, i) => (
                            <span
                              key={i}
                              className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No suggestions found.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">People Also Ask</p>
                      {selected.google_data.peopleAlsoAsk.length > 0 ? (
                        <div className="mt-1 space-y-2">
                          {selected.google_data.peopleAlsoAsk.map((q, i) => (
                            <div key={i} className="rounded-lg border border-border p-2.5">
                              <p className="text-sm">{q.question}</p>
                              {q.snippet && (
                                <p className="mt-0.5 text-xs text-muted-foreground">{q.snippet}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No questions found.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Related searches</p>
                      {selected.google_data.relatedSearches.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {selected.google_data.relatedSearches.map((s, i) => (
                            <span
                              key={i}
                              className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No related searches found.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">No Google results in this pull.</p>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-medium text-muted-foreground">Reddit</h3>
                <p className="mt-0.5 text-xs text-amber-600">
                  Via site-scoped search, not a dedicated Reddit API integration (no
                  approved official API access).
                </p>
                <div className="mt-2 space-y-2">
                  {(selected.reddit_data ?? []).map((r, i) => (
                    <div key={i} className="rounded-lg border border-border p-2.5">
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {r.title}
                      </a>
                      {r.snippet && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{r.snippet}</p>
                      )}
                    </div>
                  ))}
                  {(selected.reddit_data ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No Reddit results in this pull.</p>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-medium text-muted-foreground">Quora</h3>
                <div className="mt-2 space-y-2">
                  {(selected.quora_data ?? []).map((q, i) => (
                    <div key={i} className="rounded-lg border border-border p-2.5">
                      <a
                        href={q.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {q.title}
                      </a>
                      {q.snippet && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{q.snippet}</p>
                      )}
                    </div>
                  ))}
                  {(selected.quora_data ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No Quora results in this pull.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
