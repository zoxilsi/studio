"use client";

/**
 * Pattern overlay controls — a library of geometric backgrounds (grids,
 * dots, lines, waves…) rendered by the post shader on top of the gradient.
 * The type picker is a swatch grid with SVG previews.
 */

import { Slider } from "@/components/ui/Slider";
import { ColorField } from "@/components/ui/ColorField";
import { useMeshStore } from "@/store/meshStore";
import { cn } from "@/lib/utils";
import type { PatternType } from "@/types/gradient";

const S = {
  fill: "currentColor",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
};

const PATTERN_OPTIONS: { value: PatternType; label: string; icon: React.ReactNode }[] = [
  {
    value: "none",
    label: "None",
    icon: (
      <g fill="none" stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinecap="round">
        <circle cx="12" cy="12" r="7" />
        <path d="M7 17 17 7" />
      </g>
    ),
  },
  {
    value: "grid",
    label: "Grid",
    icon: (
      <g stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinecap="round">
        <path d="M9 4v16M15 4v16M4 9h16M4 15h16" />
      </g>
    ),
  },
  {
    value: "dots",
    label: "Dots",
    icon: (
      <g fill={S.fill}>
        {[6, 12, 18].flatMap((x) =>
          [6, 12, 18].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />)
        )}
      </g>
    ),
  },
  {
    value: "dot-grid",
    label: "Dot grid",
    icon: (
      <g fill={S.fill}>
        {[4, 9.33, 14.66, 20].flatMap((x) =>
          [4, 9.33, 14.66, 20].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />)
        )}
      </g>
    ),
  },
  {
    value: "lines-h",
    label: "Lines H",
    icon: (
      <g stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinecap="round">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </g>
    ),
  },
  {
    value: "lines-v",
    label: "Lines V",
    icon: (
      <g stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinecap="round">
        <path d="M7 4v16M12 4v16M17 4v16" />
      </g>
    ),
  },
  {
    value: "diagonal",
    label: "Diagonal",
    icon: (
      <g stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinecap="round">
        <path d="M4 14 14 4M4 20 20 4M10 20 20 10" />
      </g>
    ),
  },
  {
    value: "cross",
    label: "Crosses",
    icon: (
      <g stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinecap="round">
        <path d="M8 5v6M5 8h6M16 13v6M13 16h6" />
      </g>
    ),
  },
  {
    value: "checker",
    label: "Checker",
    icon: (
      <g fill={S.fill}>
        <rect x="4" y="4" width="8" height="8" />
        <rect x="12" y="12" width="8" height="8" />
      </g>
    ),
  },
  {
    value: "waves",
    label: "Waves",
    icon: (
      <g fill="none" stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinecap="round">
        <path d="M4 9c2.5-3 5.5-3 8 0s5.5 3 8 0" />
        <path d="M4 15c2.5-3 5.5-3 8 0s5.5 3 8 0" />
      </g>
    ),
  },
  {
    value: "rings",
    label: "Rings",
    icon: (
      <g fill="none" stroke={S.stroke} strokeWidth={S.strokeWidth}>
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="7" />
      </g>
    ),
  },
  {
    value: "hex",
    label: "Hex",
    icon: (
      <g fill="none" stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinejoin="round">
        <path d="M12 4l6.5 3.75v7.5L12 19l-6.5-3.75v-7.5z" />
      </g>
    ),
  },
  {
    value: "tiles",
    label: "Tiles",
    icon: (
      <g fill="none" stroke={S.stroke} strokeWidth={S.strokeWidth}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </g>
    ),
  },
  {
    value: "triangles",
    label: "Triangles",
    icon: (
      <g fill="none" stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinejoin="round">
        <path d="M12 4l7 12H5z" />
      </g>
    ),
  },
  {
    value: "zigzag",
    label: "Zigzag",
    icon: (
      <g fill="none" stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinejoin="round">
        <path d="M3 14l4.5-6 4.5 6 4.5-6 4.5 6" />
      </g>
    ),
  },
  {
    value: "stars",
    label: "Stars",
    icon: (
      <g fill="none" stroke={S.stroke} strokeWidth={S.strokeWidth} strokeLinejoin="round">
        <path d="M12 3l2.5 6.5L21 10l-5 4.5 1.5 7-6-3.5-6 3.5 1.5-7L2 10l6.5-.5z" />
      </g>
    ),
  },
];

export function PatternSection() {
  const effects = useMeshStore((s) => s.doc.effects);
  const updateEffects = useMeshStore((s) => s.updateEffects);
  const commit = useMeshStore((s) => s.commit);

  const off = effects.patternType === "none";
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Pattern</span>
        <div role="radiogroup" aria-label="Pattern type" className="grid grid-cols-4 gap-1.5">
          {PATTERN_OPTIONS.map((opt) => {
            const active = effects.patternType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                title={opt.label}
                onClick={() => {
                  commit();
                  updateEffects({ patternType: opt.value });
                }}
                className={cn(
                  "flex aspect-square cursor-pointer items-center justify-center rounded-lg border outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-focus",
                  active
                    ? "border-ink/40 bg-hover text-ink"
                    : "border-glass-border bg-glass-soft text-faint hover:text-muted"
                )}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  {opt.icon}
                </svg>
              </button>
            );
          })}
        </div>
      </div>
      <Slider
        label="Scale"
        value={effects.patternSize}
        min={4}
        max={80}
        step={1}
        disabled={off}
        onChange={(patternSize) => updateEffects({ patternSize })}
        onCommitStart={commit}
        format={(v) => v.toFixed(0)}
      />
      <Slider
        label="Opacity"
        value={effects.patternOpacity}
        min={0}
        max={1}
        disabled={off}
        onChange={(patternOpacity) => updateEffects({ patternOpacity })}
        onCommitStart={commit}
        format={pct}
      />
      <Slider
        label="Thickness"
        value={effects.patternThickness}
        min={0.02}
        max={0.5}
        disabled={off || effects.patternType === "checker"}
        onChange={(patternThickness) => updateEffects({ patternThickness })}
        onCommitStart={commit}
        format={pct}
      />
      <ColorField
        label="Pattern color"
        value={effects.patternColor}
        onChange={(patternColor) => updateEffects({ patternColor })}
        onCommitStart={commit}
      />
    </>
  );
}
