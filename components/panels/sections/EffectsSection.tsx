"use client";

import { Slider } from "@/components/ui/Slider";
import { useMeshStore } from "@/store/meshStore";

export function EffectsSection() {
  const effects = useMeshStore((s) => s.doc.effects);
  const updateEffects = useMeshStore((s) => s.updateEffects);
  const commit = useMeshStore((s) => s.commit);

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <>
      <Slider label="Film grain" value={effects.grain} min={0} max={1} onChange={(grain) => updateEffects({ grain })} onCommitStart={commit} format={pct} />
      <Slider label="Grain size" value={effects.grainSize} min={0.5} max={4} disabled={effects.grain === 0} onChange={(grainSize) => updateEffects({ grainSize })} onCommitStart={commit} format={(v) => v.toFixed(1)} />
      <Slider label="Progressive blur" value={effects.blurAmount} min={0} max={1} onChange={(blurAmount) => updateEffects({ blurAmount })} onCommitStart={commit} format={pct} />
      <Slider label="Blur start" value={effects.blurStart} min={0} max={1} disabled={effects.blurAmount === 0} onChange={(blurStart) => updateEffects({ blurStart })} onCommitStart={commit} format={pct} />
      <Slider label="Blur end" value={effects.blurEnd} min={0} max={1} disabled={effects.blurAmount === 0} onChange={(blurEnd) => updateEffects({ blurEnd })} onCommitStart={commit} format={pct} />
      <Slider label="Chromatic aberration" value={effects.chromaticAberration} min={0} max={1} onChange={(chromaticAberration) => updateEffects({ chromaticAberration })} onCommitStart={commit} format={pct} />
      <Slider label="Glass distortion" value={effects.distortion} min={0} max={1} onChange={(distortion) => updateEffects({ distortion })} onCommitStart={commit} format={pct} />
      <Slider label="Distortion scale" value={effects.distortionScale} min={1} max={20} disabled={effects.distortion === 0} onChange={(distortionScale) => updateEffects({ distortionScale })} onCommitStart={commit} format={(v) => v.toFixed(0)} />
      <Slider label="Glow" value={effects.glow} min={0} max={1} onChange={(glow) => updateEffects({ glow })} onCommitStart={commit} format={pct} />
      <Slider label="Vignette" value={effects.vignette} min={0} max={1} onChange={(vignette) => updateEffects({ vignette })} onCommitStart={commit} format={pct} />
      <Slider label="Pixelate" value={effects.pixelate} min={0} max={160} step={1} onChange={(pixelate) => updateEffects({ pixelate })} onCommitStart={commit} format={(v) => (v === 0 ? "Off" : v.toFixed(0))} />
      <Slider label="Posterize" value={effects.posterize} min={0} max={16} step={1} onChange={(posterize) => updateEffects({ posterize })} onCommitStart={commit} format={(v) => (v < 2 ? "Off" : v.toFixed(0))} />
    </>
  );
}
