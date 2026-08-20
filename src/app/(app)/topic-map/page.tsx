import { cookies } from "next/headers";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { pillarColor, pillarsFor } from "@/lib/pillars";
import { getMergedPillarStructure } from "@/lib/custom-sub-topics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowCard } from "@/components/glow-card";
import { addCustomSubTopic } from "./actions";

// Deliberately not named "Pillar Tree", that name is already associated
// with a different, removed feature (the organic branch visualization,
// docs/builder-brief.md Section 15.1, removed as part of the Command
// Center redesign), reusing it risks real confusion later. This is a
// different, simpler diagram on purpose: a hub-and-spoke connector view,
// not an organic tree, no branches/leaves metaphor, no expand/collapse.
// Each Pillar is its own container in that pillar's brand color
// (pillarColor, src/lib/pillars.ts, same source as PillarTag elsewhere),
// straight lines connect it to each of its Sub-topic containers, each of
// those colored as a lighter tint of the same parent color rather than
// its own arbitrary color, so the relationship reads at a glance.
export default async function TopicMapPage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;
  const structure = await getMergedPillarStructure(brand);
  const pillars = pillarsFor(brand);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Topic Map</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every pillar and its sub-topics for this brand, hub-and-spoke.
      </p>

      {/* Custom sub-topics are extensible (pillars are not), added here
          and merged everywhere else the pillar structure is read
          (Idea Panel, Production Status, Competitors, Journey Log filters,
          see src/lib/custom-sub-topics.ts). */}
      <form action={addCustomSubTopic} className="mt-6">
        <GlowCard glow={1} className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="pillar">Pillar</Label>
            <select
              id="pillar"
              name="pillar"
              defaultValue=""
              required
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="" disabled>
                Choose a pillar
              </option>
              {pillars.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub_topic">New sub-topic</Label>
            <Input id="sub_topic" name="sub_topic" required placeholder="e.g. Cold Exposure" className="h-8" />
          </div>
          <Button type="submit" size="sm">
            + Add sub-topic
          </Button>
        </GlowCard>
      </form>

      <div className="mt-8 space-y-10">
        {Object.entries(structure).map(([pillar, subTopics]) => {
          const color = pillarColor(pillar);
          return (
            <div key={pillar} className="flex flex-col items-start gap-4 sm:flex-row sm:gap-8">
              {/* Hub */}
              <div
                className="flex w-full shrink-0 items-center justify-center rounded-xl border-2 px-4 py-5 text-center text-sm font-semibold sm:w-40"
                style={{
                  borderColor: color,
                  backgroundColor: `${color}22`,
                  color,
                  boxShadow: `0 0 28px ${color}33`,
                }}
              >
                {pillar}
              </div>

              {/* Spokes: a shared vertical spine (the "hub-and-spoke"
                  trunk this pillar's own connections branch from is
                  purely visual, not a data relationship of its own,
                  see the flex-col wrapper below), each sub-topic gets
                  its own short horizontal line off that spine, both
                  drawn as plain straight divs, not curved/organic. */}
              <div className="relative w-full flex-1 pl-0 sm:pl-8">
                <div
                  className="absolute top-0 bottom-0 left-0 hidden w-px sm:block"
                  style={{ backgroundColor: `${color}66` }}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap gap-3">
                  {subTopics.map((sub) => (
                    <div key={sub} className="relative flex items-center">
                      <span
                        className="absolute top-1/2 -left-8 hidden h-px w-8 -translate-y-1/2 sm:block"
                        style={{ backgroundColor: `${color}66` }}
                        aria-hidden="true"
                      />
                      <div
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: `${color}66`, backgroundColor: `${color}14`, color }}
                      >
                        {sub}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
