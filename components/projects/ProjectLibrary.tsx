"use client";

import { useEffect, useRef, useState } from "react";
import { useUiStore } from "@/store/uiStore";
import { PRESETS } from "@/lib/presets";
import { useMeshStore, defaultDoc } from "@/store/meshStore";
import { exportJson, parseImportedJson, downloadText } from "@/lib/export";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

const AUTOSAVE = "jlk-wallpaper-autosave-v1";
const LIBRARY = "jlk-wallpaper-projects-v1";
interface SavedProject { id: string; name: string; updated: number; json: string }
function readProjects(): SavedProject[] {
  const items: unknown = JSON.parse(localStorage.getItem(LIBRARY) || "[]");
  return Array.isArray(items) ? items.filter((p): p is SavedProject => typeof p?.id === "string" && typeof p?.name === "string" && typeof p?.json === "string" && typeof p?.updated === "number") : [];
}

/** Restore before subscribing, then save document changes (including shapes). */
export function ProjectAutosave() {
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE);
      if (saved) {
        const doc = parseImportedJson(saved);
        useMeshStore.setState({ doc, past: [], future: [], selectedId: null });
      } else {
        const doc = structuredClone(PRESETS.find(p => p.name === "Glass Mosaic")?.doc ?? defaultDoc());
        doc.canvas = { ...doc.canvas, width: 1170, height: 2532 };
        doc.animation.playing = false;
        useMeshStore.setState({ doc, past: [], future: [], selectedId: null });
      }
    } catch { setError("Your last design could not be restored. Open a saved project or import a project file."); }
    let timer: ReturnType<typeof setTimeout>;
    const save = () => {
      try { localStorage.setItem(AUTOSAVE, exportJson(useMeshStore.getState().doc)); }
      catch { setError("Autosave is unavailable or storage is full. Export a project file to keep your work."); }
    };
    save();
    const unsubscribe = useMeshStore.subscribe((state, previous) => {
      if (state.doc === previous.doc) return;
      clearTimeout(timer);
      timer = setTimeout(save, 350);
    });
    const flush = () => { clearTimeout(timer); save(); };
    window.addEventListener("pagehide", flush);
    const visibility = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { flush(); unsubscribe(); window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return error ? <div role="alert" className="fixed left-4 right-4 top-20 z-50 rounded-xl bg-red-950 p-4 text-sm text-white">{error}<button className="ml-3 min-h-11 underline" onClick={() => setError("")}>Dismiss</button></div> : null;
}

export function ProjectLibrary({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useUiStore(s => s.theme);
  const toggleTheme = useUiStore(s => s.toggleTheme);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [name, setName] = useState("My wallpaper");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    try { setProjects(readProjects()); } catch { setMessage("Saved projects could not be read. Export your current design for safekeeping."); }
  }, [open]);
  function persist(items: SavedProject[]) {
    try { localStorage.setItem(LIBRARY, JSON.stringify(items)); setProjects(items); return true; }
    catch { setMessage("Browser storage is full or unavailable. Export a project file instead."); return false; }
  }
  function save() {
    const item = { id: crypto.randomUUID(), name: name.trim() || "Untitled wallpaper", updated: Date.now(), json: exportJson(useMeshStore.getState().doc) };
    if (persist([item, ...projects])) { setMessage("Saved on this device."); return true; }
    return false;
  }
  async function importFile(file?: File) {
    if (!file) return;
    try { useMeshStore.getState().applyDoc(parseImportedJson(await file.text())); onClose(); }
    catch { setMessage("This file could not be opened. Choose a valid .mesha project."); }
    if (input.current) input.current.value = "";
  }
  return <Dialog open={open} onClose={onClose} title="Your projects">
    <div className="space-y-5">
      <p className="text-sm text-muted">Your latest design saves automatically in this browser. Save named copies here, or export a portable project file for backup.</p>
      <label className="block text-sm text-ink">Project name<input className="mt-2 h-11 w-full rounded-xl border border-glass-border bg-glass-soft px-3" value={name} maxLength={80} onChange={e => setName(e.target.value)} /></label>
      <div className="flex flex-wrap gap-2"><Button className="min-h-11" variant="primary" onClick={save}>Save copy</Button><Button className="min-h-11" variant="outline" onClick={() => downloadText(exportJson(useMeshStore.getState().doc), "JLK-wallpaper.mesha", "application/json")}>Export project</Button><Button className="min-h-11" variant="outline" onClick={() => input.current?.click()}>Open file</Button></div>
      <input ref={input} type="file" accept=".mesha,.json,application/json" className="hidden" aria-label="Import project" onChange={e => void importFile(e.target.files?.[0])} />
      {message && <p role="status" className="text-sm text-ink">{message}</p>}
      <ul className="space-y-2">{projects.map(project => <li key={project.id} className="flex items-center gap-2 border-b border-glass-border py-2"><button className="min-h-11 min-w-0 flex-1 text-left text-sm text-ink" onClick={() => { try { useMeshStore.getState().applyDoc(parseImportedJson(project.json)); onClose(); } catch { setMessage("This saved project is damaged. Try a portable backup."); } }}><span className="block truncate font-medium">{project.name}</span><span className="text-xs text-muted">{new Date(project.updated).toLocaleString()}</span></button><Button className="min-h-11" variant="danger" aria-label={`Delete ${project.name}`} onClick={() => persist(projects.filter(p => p.id !== project.id))}>Delete</Button></li>)}</ul>
      {!projects.length && <p className="text-sm text-muted">No named projects yet. Save your first copy above.</p>}
      <Button className="min-h-11" variant="outline" onClick={() => { if (!save()) return; const doc = defaultDoc(); doc.canvas.width = 1290; doc.canvas.height = 2796; useMeshStore.getState().applyDoc(doc); onClose(); }}>Save copy & new wallpaper</Button>
      <details className="border-t border-glass-border pt-4 text-sm text-muted"><summary className="min-h-11 cursor-pointer text-ink">About JLK Wallpaper Studio</summary><p className="mt-2">Built on <a className="underline" href="https://github.com/zoxilsi/studio" target="_blank" rel="noreferrer">zoxilsi studio</a>, an MIT-licensed creative engine. Copyright and license notices remain in the project.</p><div className="my-3 flex flex-wrap gap-2"><Button className="min-h-11" variant="outline" onClick={toggleTheme}>Use {theme === "dark" ? "light" : "dark"} appearance</Button><Button className="min-h-11" variant="outline" onClick={() => { onClose(); useUiStore.getState().setShortcutsOpen(true); }}>Keyboard shortcuts</Button></div><p className="mt-3">On iPhone, use Safari’s Share menu → Add to Home Screen. An internet connection is required to launch. Projects stay in this browser; clearing site data removes local saves.</p></details>
    </div>
  </Dialog>;
}
