"use client";

import { useMeshStore } from "@/store/meshStore";
import { SHAPE_NAMES } from "@/lib/shapes";
import type { ShapeKind, WallpaperShape } from "@/types/gradient";
import { Slider } from "@/components/ui/Slider";
import { ColorField } from "@/components/ui/ColorField";

const button = "min-h-11 rounded-xl border border-glass-border bg-glass-soft px-3 text-xs font-medium text-ink transition-colors hover:bg-glass focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-35";

export function ShapesPanel() {
  const store = useMeshStore();
  const shapes = store.doc.shapes ?? [];
  const shape = shapes.find((s) => s.id === store.selectedShapeId);
  const update = (patch: Partial<WallpaperShape>) => shape && store.updateShape(shape.id, patch);
  const discrete = (patch: Partial<WallpaperShape>) => { store.commit(); update(patch); };
  const index = shapes.findIndex((s) => s.id === shape?.id);
  return <div className="space-y-5" data-testid="shapes-panel">
    <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-ink">Add a shape</h3><span className="text-xs text-muted">{shapes.length}/32</span></div>
    <div className="grid grid-cols-5 gap-1.5">
      {(Object.keys(SHAPE_NAMES) as ShapeKind[]).map((kind) => <button key={kind} className={`${button} !px-1 flex flex-col items-center justify-center gap-2 py-3 !text-[9px]`} aria-label={`Add ${SHAPE_NAMES[kind]}`} disabled={shapes.length >= 32} onClick={() => store.addShape(kind)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>{kind === "ellipse" ? <circle cx="12" cy="12" r="8"/> : kind === "diamond" ? <path d="M12 2 21 12 12 22 3 12Z"/> : kind === "arch" ? <path d="M4 21V10a8 8 0 0 1 16 0v11h-4V10a4 4 0 0 0-8 0v11Z"/> : kind === "line" ? <path d="M3 10h18v4H3Z"/> : <rect x="4" y="4" width="16" height="16" rx="3"/>}</svg>{SHAPE_NAMES[kind]}</button>)}
    </div>
    {shapes.length > 0 && <label className="flex flex-col gap-2 text-xs text-muted">Selected shape
      <select className={`${button} w-full`} aria-label="Selected shape" value={shape?.id ?? ""} onChange={(e) => store.selectShape(e.target.value || null)}>
        <option value="">Choose an object</option>
        {shapes.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {SHAPE_NAMES[s.kind]}</option>)}
      </select>
    </label>}
    {!shape ? <p className="text-xs leading-relaxed text-muted">Add an object or tap one on your artwork. Drag it into place, then fine-tune its palette and proportions here.</p> : <>
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-ink">{SHAPE_NAMES[shape.kind]}</h3><span className="text-xs text-muted">Drag on canvas to move</span></div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Shape fill colors">{[1, 2, 4].map((count) => <button key={count} className={button} aria-pressed={shape.colors.length === count} style={shape.colors.length === count ? { borderColor: "#b8a3ff", background: "#b8a3ff20" } : undefined} onClick={() => discrete({ colors: Array.from({ length: count }, (_, i) => shape.colors[i] ?? ["#fff1d6", "#ff8cab", "#b8a3ff", "#75e0db"][i]) })}>{count} {count === 1 ? "color" : "colors"}</button>)}</div>
      <div className="grid grid-cols-2 gap-3">{shape.colors.map((color, i) => <ColorField key={i} label={`Shape color ${i + 1}`} value={color} onCommitStart={store.commit} onChange={(hex) => update({ colors: shape.colors.map((c, j) => j === i ? hex : c) })} />)}</div>
      <Slider label="Shape opacity" min={0} max={1} value={shape.opacity} onCommitStart={store.commit} onChange={(opacity) => update({ opacity })} format={(n) => `${Math.round(n * 100)}%`} />
      <Slider label="Shape width" min={.02} max={1.5} value={shape.width} onCommitStart={store.commit} onChange={(width) => update({ width })} format={(n) => `${Math.round(n * 100)}%`} />
      <Slider label={shape.kind === "line" ? "Stripe thickness" : "Shape height"} min={.01} max={1.5} value={shape.height} onCommitStart={store.commit} onChange={(height) => update({ height })} format={(n) => `${Math.round(n * 100)}%`} />
      <Slider label="Shape rotation" min={-180} max={180} step={1} value={shape.rotation} onCommitStart={store.commit} onChange={(rotation) => update({ rotation })} format={(n) => `${Math.round(n)}°`} />
      {shape.kind === "arch" && <Slider label="Band thickness" min={.02} max={.48} value={shape.thickness} onCommitStart={store.commit} onChange={(thickness) => update({ thickness })} format={(n) => `${Math.round(n * 100)}%`} />}
      {shape.kind === "rectangle" && <Slider label="Corner roundness" min={0} max={.5} value={shape.radius} onCommitStart={store.commit} onChange={(radius) => update({ radius })} format={(n) => `${Math.round(n * 100)}%`} />}
      <details className="text-xs text-muted"><summary className="flex min-h-11 cursor-pointer items-center">Precise position</summary><div className="space-y-4 pt-2">
        <Slider label="Shape X" min={-.25} max={1.25} value={shape.x} onCommitStart={store.commit} onChange={(x) => update({ x })} format={(n) => `${Math.round(n * 100)}%`} />
        <Slider label="Shape Y" min={-.25} max={1.25} value={shape.y} onCommitStart={store.commit} onChange={(y) => update({ y })} format={(n) => `${Math.round(n * 100)}%`} />
      </div></details>
      <div className="grid grid-cols-2 gap-2">
        <button className={button} onClick={() => store.reorderShape(shape.id, -1)} disabled={index === 0}>Send backward</button>
        <button className={button} onClick={() => store.reorderShape(shape.id, 1)} disabled={index === shapes.length - 1}>Bring forward</button>
        <button className={button} onClick={() => store.duplicateShape(shape.id)} disabled={shapes.length >= 32}>Duplicate shape</button>
        <button className={`${button} text-red-400`} onClick={() => store.deleteShape(shape.id)}>Delete shape</button>
      </div>
    </>}
  </div>;
}
