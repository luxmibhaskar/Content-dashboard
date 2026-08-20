"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { PILLAR_STRUCTURE } from "@/lib/pillars";
import type { Brand } from "@/lib/brand";

const SELECT_CLASSNAME = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";

// Real, confirmed bug: Pillar and Sub-topic were plain text entry, no
// connection at all to PILLAR_STRUCTURE (src/lib/pillars.ts), the same
// fixed Body/Mind/Soul (LBsTransformation) or Build/Sell/Scale
// (LBsWorks) vocabulary the Competitors sub-topic multiselect and the
// brand/pillar/branch selectors elsewhere already use. Fixed here as
// two coupled native selects (not the Competitors page's tag-input
// multiselect, this is one pillar and one sub-topic per item, not a
// set), sub-topic's own option list re-derives from whichever pillar is
// currently selected, not every branch from every pillar at once.
//
// Returns the two field blocks directly, no wrapping grid of its own:
// every caller (Content Calendar's topic page, Idea Panel's quick-add
// form and its own edit page) places Pillar/Sub-topic inside a
// different surrounding grid already, wrapping here would fight
// whatever the caller needs (a 2-column grid on one page, one slot
// inside a 4-column grid on another).
export function PillarSubTopicSelects({
  brand,
  initialPillar,
  initialSubTopic,
}: {
  brand: Brand;
  initialPillar: string;
  initialSubTopic: string;
}) {
  const structure = PILLAR_STRUCTURE[brand];
  const pillars = Object.keys(structure);
  const [pillar, setPillar] = useState(initialPillar);

  // A legacy value that predates this fix, or free text typed before
  // it, might not match the fixed vocabulary at all. Rather than the
  // select silently falling back to its first option (and then wiping
  // that value out the next time this form saves), it stays selectable
  // as its own extra option so nothing already stored gets lost.
  const pillarOptions = pillar && !pillars.includes(pillar) ? [pillar, ...pillars] : pillars;
  const subTopicsForPillar = pillar ? (structure[pillar] ?? []) : [];
  const subTopicOptions =
    initialSubTopic && pillar === initialPillar && !subTopicsForPillar.includes(initialSubTopic)
      ? [initialSubTopic, ...subTopicsForPillar]
      : subTopicsForPillar;

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="pillar">Pillar</Label>
        <select
          id="pillar"
          name="pillar"
          value={pillar}
          onChange={(e) => setPillar(e.target.value)}
          className={SELECT_CLASSNAME}
        >
          <option value="">-</option>
          {pillarOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sub_topic">Sub-topic</Label>
        {/* Keyed on pillar: changing pillar remounts this select fresh
            rather than keeping a now-mismatched sub-topic selected, a
            plain defaultValue wouldn't clear on its own since this
            isn't a controlled input. */}
        <select
          key={pillar}
          id="sub_topic"
          name="sub_topic"
          defaultValue={pillar === initialPillar ? initialSubTopic : ""}
          className={SELECT_CLASSNAME}
        >
          <option value="">-</option>
          {subTopicOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
