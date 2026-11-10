"use client";

import { useRef, useState } from "react";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore, type MobileTool } from "@/store/uiStore";
import { UndoIcon, RedoIcon, CloseIcon, EyeIcon, SlidersIcon, PointsIcon } from "@/components/ui/icons";
import { SettingsSection } from "@/components/panels/sections/SettingsSection";
import { NodeSection } from "@/components/panels/sections/NodeSection";
import { ColorSection } from "@/components/panels/sections/ColorSection";
import { EffectsSection } from "@/components/panels/sections/EffectsSection";
import { PatternSection } from "@/components/panels/sections/PatternSection";
import { BackdropGlowSection } from "@/components/panels/sections/BackdropGlowSection";
import { AnimationSection } from "@/components/panels/sections/AnimationSection";
import { BackgroundSection } from "@/components/panels/sections/BackgroundSection";
import { PresetsRail } from "@/components/panels/PresetsRail";
import { ShapesPanel } from "@/components/panels/ShapesPanel";
import { Section } from "@/components/ui/Section";
import { ColorField } from "@/components/ui/ColorField";

const TOOLS: MobileTool[] = ["Colors", "Mesh", "Shapes", "Effects", "Patterns", "Presets"];
function ToolIcon({tool}:{tool:MobileTool}) {
  if(tool === "Mesh") return <PointsIcon />;
  if(tool === "Effects") return <SlidersIcon />;
  if(tool === "Patterns") return <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>{[4,10,16].flatMap(x=>[4,10,16].map(y=><circle key={`${x}-${y}`} cx={x} cy={y} r="1.3"/>))}</svg>;
  if(tool === "Presets") return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="m10 2 8 4-8 4-8-4Zm-8 9 8 4 8-4M2 15l8 4 8-4"/></svg>;
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>{tool === "Colors" ? <path d="M10 2C8 5 4 9 4 12a6 6 0 0 0 12 0c0-3-4-7-6-10Z"/> : <path d="M4 3v8a6 6 0 0 0 12 0V3h-3v8a3 3 0 0 1-6 0V3Z"/>}</svg>;
}
export function MobileHeader({onProjects}:{onProjects:()=>void}) {
 const past=useMeshStore(s=>s.past.length), future=useMeshStore(s=>s.future.length);
 const preview=useUiStore(s=>s.preview);
 return <header className="mobile-header">
  <button className="project-trigger" onClick={onProjects} aria-label="Projects">JLK Studio <span aria-hidden>⌄</span></button>
  <button aria-label="Undo" disabled={!past} onClick={()=>useMeshStore.getState().undo()}><UndoIcon/></button>
  <button aria-label="Redo" disabled={!future} onClick={()=>useMeshStore.getState().redo()}><RedoIcon/></button>
  <button className="preview-trigger" aria-label={preview?"Done preview":"Preview"} onClick={()=>useUiStore.getState().setPreview(!preview)}>{preview?"Done":<EyeIcon/>}</button>
  <button className="export-trigger" onClick={()=>useUiStore.getState().setExportOpen(true)}>Export</button>
 </header>;
}
export function MobileNavigation(){
 const tool=useUiStore(s=>s.mobileTool), preview=useUiStore(s=>s.preview);
 if(preview) return null;
 return <nav className="mobile-navigation" aria-label="Creative tools">{TOOLS.map(t=><button key={t} aria-pressed={tool===t} onClick={()=>useUiStore.getState().setMobileTool(tool===t?null:t)}><ToolIcon tool={t}/><span>{t}</span></button>)}</nav>;
}
function Palette(){
 const nodes=useMeshStore(s=>s.doc.nodes);
 return <><p className="tool-hint">Your mesh palette. Tap a color to make it yours.</p><div className="mesh-palette">{nodes.map((node,i)=><ColorField key={node.id} label={`Point ${i+1}`} value={node.color} onCommitStart={()=>useMeshStore.getState().commit()} onChange={color=>useMeshStore.getState().setNodeColor(node.id,color)}/>)}</div><ColorSection/></>;
}
export function MobilePanel(){
 const tool=useUiStore(s=>s.mobileTool);
 const [expanded,setExpanded]=useState(false);
 const start=useRef(0);
 if(!tool) return null;
 return <aside className={`mobile-panel ${expanded?"is-expanded":""}`} aria-label={`${tool} tools`}>
  <div className="sheet-grip" onPointerDown={e=>{start.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{const dy=e.clientY-start.current;if(dy < -35)setExpanded(true);else if(dy>60){if(expanded)setExpanded(false);else useUiStore.getState().setMobileTool(null);}}}><span/></div>
  <header><h2>{tool}</h2><button aria-label={expanded?"Collapse panel":"Expand panel"} onClick={()=>setExpanded(!expanded)}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 3h4v4M15 3l-5 5M7 15H3v-4M3 15l5-5"/></svg></button><button aria-label="Close panel" onClick={()=>useUiStore.getState().setMobileTool(null)}><CloseIcon/></button></header>
  <div className="mobile-panel-body studio-scroll" key={tool}>
   {tool === "Colors" && <div className="tool-fields"><Palette/></div>}
   {tool === "Mesh" && <><div className="tool-fields"><SettingsSection/></div><Section title="Selected point" defaultOpen><NodeSection/></Section><Section title="Animation"><AnimationSection/></Section><Section title="Background"><BackgroundSection/></Section></>}
   {tool === "Shapes" && <div className="tool-fields"><ShapesPanel/></div>}
   {tool === "Effects" && <><div className="tool-fields"><EffectsSection/></div><Section title="Color & brightness"><ColorSection/></Section><Section title="Backdrop glow"><BackdropGlowSection/></Section><Section title="Animation"><AnimationSection/></Section></>}
   {tool === "Patterns" && <div className="tool-fields"><PatternSection/></div>}
   {tool === "Presets" && <PresetsRail embedded/>}
  </div>
 </aside>;
}
