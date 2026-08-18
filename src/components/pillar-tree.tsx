"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { pillarColor } from "@/lib/pillars";
import { createTopicUnderBranch, updateLockState } from "@/app/(app)/pillar-tree/actions";

export type TreeTopic = {
  id: string;
  final_title: string | null;
  is_locked: boolean;
  unlock_condition: string | null;
  devScore: number;
};

type BranchConfig = { heightFrac: number; angle: number; length: number; curve: number };

const BRANCH_LAYOUTS: BranchConfig[] = [
  { heightFrac: 0.88, angle: -64, length: 92, curve: 16 },
  { heightFrac: 0.68, angle: -27, length: 112, curve: -11 },
  { heightFrac: 0.48, angle: 3, length: 128, curve: 9 },
  { heightFrac: 0.3, angle: 33, length: 108, curve: -13 },
  { heightFrac: 0.12, angle: 65, length: 88, curve: 11 },
];

const WIDTH = 300;
const HEIGHT = 340;
const TRUNK_BASE_X = WIDTH / 2;
const TRUNK_BASE_Y = HEIGHT - 20;
const TRUNK_HEIGHT = 210;

function jitter(seed: string, index: number) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const n = ((h + index * 977) % 17) - 8;
  return n;
}

// Filled tapered ribbon along a slightly curved spine, not a uniform
// stroked line (Section 15.1's "artistic direction, not just a node
// diagram"). baseWidth/tipWidth give the taper, curve bows the spine.
function branchPath(baseX: number, baseY: number, angleDeg: number, length: number, curve: number, baseWidth: number, tipWidth: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const dirX = Math.sin(rad);
  const dirY = -Math.cos(rad);
  const perpX = -dirY;
  const perpY = dirX;
  const tipX = baseX + dirX * length;
  const tipY = baseY + dirY * length;
  const midX = baseX + dirX * length * 0.5 + perpX * curve;
  const midY = baseY + dirY * length * 0.5 + perpY * curve;

  const d = [
    `M ${baseX - perpX * (baseWidth / 2)} ${baseY - perpY * (baseWidth / 2)}`,
    `Q ${midX - perpX * tipWidth} ${midY - perpY * tipWidth} ${tipX} ${tipY}`,
    `Q ${midX + perpX * tipWidth} ${midY + perpY * tipWidth} ${baseX + perpX * (baseWidth / 2)} ${baseY + perpY * (baseWidth / 2)}`,
    "Z",
  ].join(" ");

  return { d, tipX, tipY, midX, midY };
}

// The visible tapered branch is only a few px wide, too thin to click
// reliably (especially mid-sway). A wide, invisible stroke along the
// same spine widens the actual hit target without changing what's drawn.
function centerlinePath(baseX: number, baseY: number, midX: number, midY: number, tipX: number, tipY: number) {
  return `M ${baseX} ${baseY} Q ${midX} ${midY} ${tipX} ${tipY}`;
}

// Pointed-oval leaf silhouette, drawn at the origin then translated/rotated.
const LEAF_D = "M 0 -9 Q 5 0 0 9 Q -5 0 0 -9 Z";

function LeafGroup({
  tipX,
  tipY,
  angle,
  topics,
  color,
  onSelectBranch,
}: {
  tipX: number;
  tipY: number;
  angle: number;
  topics: TreeTopic[];
  color: string;
  onSelectBranch: () => void;
}) {
  const router = useRouter();

  if (topics.length === 0) {
    return (
      <motion.path
        d={LEAF_D}
        transform={`translate(${tipX},${tipY}) rotate(${angle})`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={0.6}
        style={{ cursor: "pointer" }}
        onClick={onSelectBranch}
        whileHover={{ scale: 1.15 }}
      />
    );
  }

  return (
    <>
      {topics.map((t, i) => {
        const spread = (i - (topics.length - 1) / 2) * 16;
        const scale = 0.75 + 0.35 * t.devScore;
        return (
          <motion.path
            key={t.id}
            d={LEAF_D}
            transform={`translate(${tipX + spread * 0.6},${tipY - Math.abs(spread) * 0.3}) rotate(${angle + spread})`}
            initial={false}
            animate={{
              scale: t.is_locked ? 0.65 * scale : scale,
              fill: t.is_locked ? "transparent" : color,
              opacity: t.is_locked ? 0.55 : 1,
            }}
            stroke={color}
            strokeWidth={1.5}
            transition={{ duration: 0.5 }}
            style={{ cursor: "pointer" }}
            onClick={() => router.push(`/calendar/${t.id}`)}
            whileHover={{ scale: (t.is_locked ? 0.65 : 1) * scale * 1.15 }}
          />
        );
      })}
    </>
  );
}

function SingleTree({
  pillar,
  subTopics,
  topicsByBranch,
  onSelectBranch,
}: {
  pillar: string;
  subTopics: string[];
  topicsByBranch: Record<string, TreeTopic[]>;
  onSelectBranch: (subTopic: string) => void;
}) {
  const color = pillarColor(pillar);
  const gradientId = `trunk-gradient-${pillar}`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-[300px]" role="img" aria-label={`${pillar} pillar tree`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} stopOpacity={0.5} />
        </linearGradient>
      </defs>

      {/* Trunk */}
      <path
        d={
          branchPath(TRUNK_BASE_X, TRUNK_BASE_Y, 0, TRUNK_HEIGHT, 0, 22, 8).d
        }
        fill={`url(#${gradientId})`}
      />

      {subTopics.map((sub, i) => {
        const layout = BRANCH_LAYOUTS[i % BRANCH_LAYOUTS.length];
        const angle = layout.angle + jitter(pillar, i);
        const baseY = TRUNK_BASE_Y - TRUNK_HEIGHT * layout.heightFrac;
        const { d, tipX, tipY, midX, midY } = branchPath(TRUNK_BASE_X, baseY, angle, layout.length, layout.curve, 9, 2.5);
        const topics = topicsByBranch[sub] ?? [];

        return (
          <motion.g
            key={sub}
            style={{ transformOrigin: `${TRUNK_BASE_X}px ${baseY}px` }}
            animate={{ rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 4.5 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d={d}
              fill={color}
              opacity={0.85}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectBranch(sub)}
            />
            <path
              d={centerlinePath(TRUNK_BASE_X, baseY, midX, midY, tipX, tipY)}
              fill="none"
              stroke="transparent"
              strokeWidth={22}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectBranch(sub)}
            />
            <LeafGroup tipX={tipX} tipY={tipY} angle={angle} topics={topics} color={color} onSelectBranch={() => onSelectBranch(sub)} />
          </motion.g>
        );
      })}

      <text x={TRUNK_BASE_X} y={HEIGHT - 4} textAnchor="middle" className="fill-foreground text-[13px] font-medium">
        {pillar}
      </text>
    </svg>
  );
}

function BranchPanel({
  pillar,
  subTopic,
  topics,
}: {
  pillar: string;
  subTopic: string;
  topics: TreeTopic[];
}) {
  const boundCreate = createTopicUnderBranch.bind(null, pillar, subTopic);

  return (
    <div className="mt-6 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{pillar}</p>
          <h2 className="text-sm font-medium">{subTopic}</h2>
        </div>
        <form action={boundCreate}>
          <Button type="submit" size="sm" variant="outline">
            + New topic here
          </Button>
        </form>
      </div>

      <ul className="mt-3 space-y-2">
        {topics.map((t) => (
          <li key={t.id} className="rounded-md border border-border p-2.5">
            <div className="flex items-center justify-between gap-2">
              <a href={`/calendar/${t.id}`} className="truncate text-sm hover:underline">
                {t.final_title || "Untitled"}
              </a>
              {t.is_locked && <span className="shrink-0 text-xs text-muted-foreground">&#128274;</span>}
            </div>
            <form action={updateLockState.bind(null, t.id)} className="mt-1.5 flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1 text-muted-foreground">
                <input type="checkbox" name="is_locked" defaultChecked={t.is_locked} className="size-3.5" />
                Locked
              </label>
              <Input
                name="unlock_condition"
                defaultValue={t.unlock_condition ?? ""}
                placeholder="Unlock condition"
                className="h-6 flex-1 text-xs"
              />
              <Button type="submit" size="xs" variant="outline">
                Save
              </Button>
            </form>
          </li>
        ))}
        {topics.length === 0 && (
          <li className="text-sm text-muted-foreground">No topics here yet, add the first one above.</li>
        )}
      </ul>
    </div>
  );
}

export function PillarTree({
  structure,
  topicsByBranch,
}: {
  structure: Record<string, string[]>;
  topicsByBranch: Record<string, TreeTopic[]>;
}) {
  const pillars = Object.keys(structure);
  const [mobilePillar, setMobilePillar] = useState(pillars[0]);
  const [selected, setSelected] = useState<{ pillar: string; subTopic: string } | null>(null);

  function select(pillar: string, subTopic: string) {
    setSelected({ pillar, subTopic });
  }

  return (
    <div>
      {/* Full width: all trees side by side, organic detail reads fine here. */}
      <div className="hidden items-start justify-center gap-4 sm:flex">
        {pillars.map((pillar) => (
          <SingleTree
            key={pillar}
            pillar={pillar}
            subTopics={structure[pillar]}
            topicsByBranch={topicsByBranch}
            onSelectBranch={(sub) => select(pillar, sub)}
          />
        ))}
      </div>

      {/* Below ~500px (Tailwind's sm breakpoint is 640px, close enough
          in practice): one tree at a time, simplified detail. */}
      <div className="sm:hidden">
        <div className="flex justify-center gap-2">
          {pillars.map((pillar) => (
            <button
              key={pillar}
              type="button"
              onClick={() => setMobilePillar(pillar)}
              className={
                mobilePillar === pillar
                  ? "rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                  : "rounded-md px-2.5 py-1 text-xs text-muted-foreground"
              }
            >
              {pillar}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-center">
          <SingleTree
            pillar={mobilePillar}
            subTopics={structure[mobilePillar]}
            topicsByBranch={topicsByBranch}
            onSelectBranch={(sub) => select(mobilePillar, sub)}
          />
        </div>
      </div>

      {selected ? (
        <BranchPanel
          pillar={selected.pillar}
          subTopic={selected.subTopic}
          topics={topicsByBranch[selected.subTopic] ?? []}
        />
      ) : (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Tap a branch to see its topics.
        </p>
      )}
    </div>
  );
}
