"use client";

/**
 * Canvas size, lattice grid controls and topology.
 */

import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { MAX_LINES, MIN_LINES } from "@/lib/mesh";
import { useMeshStore } from "@/store/meshStore";
import type { Topology } from "@/types/gradient";
import { clamp, cn } from "@/lib/utils";

const SIZES = [
  { label: "4:3", w: 4000, h: 3000 },
  { label: "16:9", w: 3840, h: 2160 },
  { label: "1:1", w: 3000, h: 3000 },
  { label: "9:16", w: 2160, h: 3840 },
];

const GRIDS = [3, 4, 5];

const TOPOLOGIES = [
  { value: "rectangle", label: "Rectangle" },
  { value: "circle", label: "Circle" },
] as const;

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="flex items-center gap-1">
        <Button size="icon" className="h-6 w-6" aria-label={`Decrease ${label}`} disabled={value <= MIN_LINES} onClick={() => onChange(value - 1)}>
          −
        </Button>
        <span className="w-5 text-center font-mono text-[11px] tabular-nums text-ink">{value}</span>
        <Button size="icon" className="h-6 w-6" aria-label={`Increase ${label}`} disabled={value >= MAX_LINES} onClick={() => onChange(value + 1)}>
          +
        </Button>
      </span>
    </div>
  );
}

export function SettingsSection() {
  const canvas = useMeshStore((s) => s.doc.canvas);
  const rows = useMeshStore((s) => s.doc.rows);
  const cols = useMeshStore((s) => s.doc.cols);
  const updateCanvas = useMeshStore((s) => s.updateCanvas);
  const setLatticeSize = useMeshStore((s) => s.setLatticeSize);
  const commit = useMeshStore((s) => s.commit);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Canvas size</span>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => (
            <Button
              key={s.label}
              size="sm"
              variant="outline"
              active={canvas.width === s.w && canvas.height === s.h}
              onClick={() => {
                commit();
                updateCanvas({ width: s.w, height: s.h });
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2">
          {(
            [
              ["Width", canvas.width, (v: number) => updateCanvas({ width: v })],
              ["Height", canvas.height, (v: number) => updateCanvas({ height: v })],
            ] as const
          ).map(([label, value, set]) => (
            <label key={label} className="flex flex-1 flex-col gap-1">
              <span className="text-[10px] text-faint">{label}</span>
              <input
                type="number"
                min={16}
                max={8192}
                value={value}
                onFocus={() => commit()}
                onChange={(e) => set(clamp(Number(e.target.value) || 16, 16, 8192))}
                className="h-8 w-full rounded-lg border border-glass-border bg-glass-soft px-2.5 font-mono text-[11px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Mesh grid</span>
        <div className="flex gap-1.5">
          {GRIDS.map((g) => (
            <Button
              key={g}
              size="sm"
              variant="outline"
              className={cn("flex-1", rows === g && cols === g && "bg-hover text-ink")}
              active={rows === g && cols === g}
              onClick={() => setLatticeSize(g, g)}
            >
              {g}×{g}
            </Button>
          ))}
        </div>
        <div className="mt-1 flex flex-col gap-2">
          <Stepper label="Rows" value={rows} onChange={(v) => setLatticeSize(v, cols)} />
          <Stepper label="Columns" value={cols} onChange={(v) => setLatticeSize(rows, v)} />
        </div>
      </div>

      <Segmented
        label="Topology"
        options={TOPOLOGIES}
        value={canvas.topology}
        onChange={(topology: Topology) => {
          commit();
          updateCanvas({ topology });
        }}
      />
    </>
  );
}
