import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ResearchSnapshot } from "@/lib/types";
import { refreshResearch } from "../research-actions";

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
    .select("id, final_title")
    .eq("id", id)
    .single();

  const { data: snapshots } = await supabase
    .from("research_snapshots")
    .select("id, content_id, snapshot_date, youtube_data, google_data, reddit_data, quora_data, summary")
    .eq("content_id", id)
    .order("snapshot_date", { ascending: false });

  const rows = (snapshots ?? []) as ResearchSnapshot[];
  const selected = snapshotParam ? rows.find((r) => r.id === snapshotParam) : rows[0];
  const isLatest = selected ? selected.id === rows[0]?.id : true;

  const boundRefresh = refreshResearch.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
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
        Only YouTube is wired up so far (top 10 videos, view counts, description, top
        comments, no real transcripts, see note below). Google, Reddit, and Quora stay
        empty until those API keys exist. Refreshing never edits or deletes a prior pull,
        it appends a new dated snapshot.
      </p>

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
            </div>
          )}
        </>
      )}
    </div>
  );
}
