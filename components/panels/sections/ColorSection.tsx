"use client";

/**
 * Color interpolation space + color correction.
 */

import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { useMeshStore } from "@/store/meshStore";
import type { ColorSpace } from "@/types/gradient";

const COLOR_SPACES = [
  { value: "rgb", label: "RGB" },
  { value: "linear-rgb", label: "Linear" },
  { value: "oklab", label: "OKLab" },
  { value: "lch", label: "LCH" },
] as const;

export function ColorSection() {
  const colorSpace = useMeshStore((s) => s.doc.canvas.colorSpace);
  const effects = useMeshStore((s) => s.doc.effects);
  const updateCanvas = useMeshStore((s) => s.updateCanvas);
  const updateEffects = useMeshStore((s) => s.updateEffects);
  const commit = useMeshStore((s) => s.commit);

  return (
    <>
      <Segmented
        label="Interpolation"
        options={COLOR_SPACES}
        value={colorSpace}
        onChange={(v: ColorSpace) => {
          commit();
          updateCanvas({ colorSpace: v });
        }}
      />
      <p className="text-[11px] leading-relaxed text-faint">
        OKLab and LCH blend perceptually — no muddy browns between
        complementary colors.
      </p>
      <Slider
        label="Saturation"
        value={effects.saturation}
        min={0}
        max={2}
        onChange={(saturation) => updateEffects({ saturation })}
        onCommitStart={commit}
      />
      <Slider
        label="Contrast"
        value={effects.contrast}
        min={0.5}
        max={1.5}
        onChange={(contrast) => updateEffects({ contrast })}
        onCommitStart={commit}
      />
      <Slider
        label="Brightness"
        value={effects.brightness}
        min={0.5}
        max={1.5}
        onChange={(brightness) => updateEffects({ brightness })}
        onCommitStart={commit}
      />
    </>
  );
}
