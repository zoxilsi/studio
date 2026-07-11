"use client";

import { Segmented } from "@/components/ui/Segmented";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { useMeshStore } from "@/store/meshStore";
import type { MouseMode } from "@/types/gradient";

const MOUSE_MODES = [
  { value: "none", label: "Off" },
  { value: "attract", label: "Attract" },
  { value: "repel", label: "Repel" },
] as const;

export function AnimationSection() {
  const animation = useMeshStore((s) => s.doc.animation);
  const updateAnimation = useMeshStore((s) => s.updateAnimation);
  const commit = useMeshStore((s) => s.commit);

  return (
    <>
      <Switch
        label="Play"
        checked={animation.playing}
        onChange={(playing) => updateAnimation({ playing })}
      />
      <Switch
        label="Reverse"
        checked={animation.reversed}
        onChange={(reversed) => updateAnimation({ reversed })}
      />
      <Slider
        label="Speed"
        value={animation.speed}
        min={0.1}
        max={3}
        onChange={(speed) => updateAnimation({ speed })}
        onCommitStart={commit}
        format={(v) => `${v.toFixed(1)}×`}
      />
      <Slider
        label="Drift"
        value={animation.amount}
        min={0}
        max={1}
        onChange={(amount) => updateAnimation({ amount })}
        onCommitStart={commit}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <Slider
        label="Hue flow"
        value={animation.hueFlow ?? 0}
        min={0}
        max={1}
        onChange={(hueFlow) => updateAnimation({ hueFlow })}
        onCommitStart={commit}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <Segmented
        label="Cursor force"
        options={MOUSE_MODES}
        value={animation.mouseMode}
        onChange={(mouseMode: MouseMode) => {
          commit();
          updateAnimation({ mouseMode });
        }}
      />
      <Slider
        label="Force strength"
        value={animation.mouseStrength}
        min={0}
        max={1}
        disabled={animation.mouseMode === "none"}
        onChange={(mouseStrength) => updateAnimation({ mouseStrength })}
        onCommitStart={commit}
      />
    </>
  );
}
