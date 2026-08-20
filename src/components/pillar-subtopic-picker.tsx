"use client";

import { useState } from "react";
import type { PillarStructure } from "@/lib/pillars";

export function PillarSubtopicPicker({
  structure,
  initialPillars,
  initialSubTopics,
}: {
  structure: PillarStructure;
  initialPillars: string[];
  initialSubTopics: string[];
}) {
  const [pillars, setPillars] = useState<string[]>(initialPillars);
  const [subTopics, setSubTopics] = useState<string[]>(initialSubTopics);

  function togglePillar(pillar: string) {
    setPillars((prev) => {
      const isSelected = prev.includes(pillar);
      const next = isSelected ? prev.filter((p) => p !== pillar) : [...prev, pillar];
      if (isSelected) {
        // Deselecting a pillar drops its sub-topics too, a sub-topic
        // shouldn't outlive the pillar it belongs to.
        const removed = new Set(structure[pillar]);
        setSubTopics((subs) => subs.filter((s) => !removed.has(s)));
      }
      return next;
    });
  }

  function toggleSubTopic(sub: string) {
    setSubTopics((prev) => (prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Pillar focus</p>
        <div className="flex flex-wrap gap-3">
          {Object.keys(structure).map((pillar) => (
            <label key={pillar} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={pillars.includes(pillar)}
                onChange={() => togglePillar(pillar)}
                className="size-3.5"
              />
              {pillar}
              <input
                type="hidden"
                name="pillar_focus"
                value={pillar}
                disabled={!pillars.includes(pillar)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Sub-topic</p>
        {pillars.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pick a pillar above to see its sub-topics.
          </p>
        ) : (
          <div className="space-y-2">
            {pillars.map((pillar) => (
              <div key={pillar}>
                <p className="text-xs font-medium text-muted-foreground">{pillar}</p>
                <div className="mt-1 flex flex-wrap gap-3">
                  {structure[pillar].map((sub) => (
                    <label key={sub} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={subTopics.includes(sub)}
                        onChange={() => toggleSubTopic(sub)}
                        className="size-3.5"
                      />
                      {sub}
                      <input
                        type="hidden"
                        name="sub_topic"
                        value={sub}
                        disabled={!subTopics.includes(sub)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
