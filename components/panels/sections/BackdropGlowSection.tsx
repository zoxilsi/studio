"use client";

/**
 * Backdrop glow controls — positioned radial lights layered over the
 * gradient. Each glow has a 9-anchor position grid, radius, intensity and
 * color, giving the corner/edge "spotlight" backdrops designers reach for.
 */

import { Slider } from "@/components/ui/Slider";
import { ColorField } from "@/components/ui/ColorField";
import { Button } from "@/components/ui/Button";
import { useMeshStore } from "@/store/meshStore";
import { cn } from "@/lib/utils";
import type { BackdropGlow } from "@/types/gradient";

const MAX_GLOWS = 4;

// 9 anchor points in UV space (y up). Slightly inset from the edges so a
// corner glow still bleeds a little onto the canvas.
const ANCHORS: { x: number; y: number; label: string }[] = [
  { x: 0.12, y: 0.88, label: "Top left" },
  { x: 0.5, y: 0.92, label: "Top" },
  { x: 0.88, y: 0.88, label: "Top right" },
  { x: 0.08, y: 0.5, label: "Left" },
  { x: 0.5, y: 0.5, label: "Center" },
  { x: 0.92, y: 0.5, label: "Right" },
  { x: 0.12, y: 0.12, label: "Bottom left" },
  { x: 0.5, y: 0.08, label: "Bottom" },
  { x: 0.88, y: 0.12, label: "Bottom right" },
];

const GLOW_PALETTE = [
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#f43f7b",
  "#ec4899",
  "#ffffff",
];

const near = (a: number, b: number) => Math.abs(a - b) < 0.03;

export function BackdropGlowSection() {
  const glows = useMeshStore((s) => s.doc.effects.backdropGlows);
  const updateEffects = useMeshStore((s) => s.updateEffects);
  const commit = useMeshStore((s) => s.commit);

  const setGlows = (next: BackdropGlow[]) => updateEffects({ backdropGlows: next });

  const patch = (i: number, partial: Partial<BackdropGlow>) => {
    setGlows(glows.map((g, idx) => (idx === i ? { ...g, ...partial } : g)));
  };

  const addGlow = () => {
    commit();
    const i = glows.length % GLOW_PALETTE.length;
    setGlows([
      ...glows,
      { x: 0.5, y: 0.92, radius: 0.75, intensity: 0.6, color: GLOW_PALETTE[i] },
    ]);
  };

  const removeGlow = (i: number) => {
    commit();
    setGlows(glows.filter((_, idx) => idx !== i));
  };

  return (
    <>
      {glows.length === 0 && (
        <p className="text-[11px] leading-relaxed text-faint">
          Add positioned lights that bleed in from a corner or edge — the
          foundation of clean “spotlight” backdrops.
        </p>
      )}

      {glows.map((glow, i) => (
        <div
          key={i}
          className="flex flex-col gap-2.5 rounded-lg border border-glass-border bg-glass-soft p-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Light {i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeGlow(i)}
              className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-faint outline-none transition-colors hover:text-red-400 focus-visible:ring-2 focus-visible:ring-focus"
              aria-label={`Remove light ${i + 1}`}
            >
              Remove
            </button>
          </div>

          <div className="flex items-start gap-2.5">
            <div
              role="radiogroup"
              aria-label={`Light ${i + 1} position`}
              className="grid shrink-0 grid-cols-3 gap-1"
            >
              {ANCHORS.map((a) => {
                const active = near(glow.x, a.x) && near(glow.y, a.y);
                return (
                  <button
                    key={a.label}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={a.label}
                    onClick={() => {
                      commit();
                      patch(i, { x: a.x, y: a.y });
                    }}
                    className={cn(
                      "h-4 w-4 cursor-pointer rounded-full border outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-focus",
                      active
                        ? "border-transparent bg-ink"
                        : "border-glass-border bg-glass hover:bg-hover"
                    )}
                  />
                );
              })}
            </div>
            <div className="flex-1">
              <ColorField
                value={glow.color}
                onChange={(color) => patch(i, { color })}
                onCommitStart={commit}
              />
            </div>
          </div>

          <Slider
            label="Radius"
            value={glow.radius}
            min={0.15}
            max={1.5}
            onChange={(radius) => patch(i, { radius })}
            onCommitStart={commit}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <Slider
            label="Intensity"
            value={glow.intensity}
            min={0}
            max={1}
            onChange={(intensity) => patch(i, { intensity })}
            onCommitStart={commit}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </div>
      ))}

      {glows.length < MAX_GLOWS && (
        <Button variant="outline" className="w-full" onClick={addGlow}>
          + Add light
        </Button>
      )}
    </>
  );
}
