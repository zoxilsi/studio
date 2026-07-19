"use client";

/**
 * The preset rail — a fixed sidebar of live-rendered thumbnails.
 * Thumbnails are rasterized from each preset's actual mesh (2D canvas,
 * no extra WebGL contexts) after mount.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PRESETS, PRESET_CATEGORIES } from "@/lib/presets";
import { renderThumbnail } from "@/lib/mesh";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";
import {
  loadUserPresets,
  saveUserPreset,
  deleteUserPreset,
  type UserPreset,
} from "@/lib/userPresets";
import { PlusIcon, TrashIcon, CheckIcon } from "@/components/ui/icons";
import type { PresetCategory } from "@/types/gradient";
import { cn, isCompact } from "@/lib/utils";

export function PresetsRail() {
  const open = useUiStore((s) => s.presetsOpen);
  const closePanels = useUiStore((s) => s.closePanels);
  const applyDoc = useMeshStore((s) => s.applyDoc);

  // Applying a preset on a compact screen dismisses the drawer to reveal the canvas.
  const applyPreset = (doc: Parameters<typeof applyDoc>[0]) => {
    applyDoc(doc);
    if (isCompact()) closePanels();
  };
  const [category, setCategory] = useState<PresetCategory | "All">("All");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  // Read the saved library after mount (localStorage is client-only).
  useEffect(() => {
    setUserPresets(loadUserPresets());
  }, [open]);

  useEffect(() => {
    // Rasterize lazily after mount so SSR/hydration stay clean.
    const t: Record<string, string> = {};
    for (const p of PRESETS) t[p.id] = renderThumbnail(p.doc, 128, 96);
    for (const p of userPresets) t[p.id] = renderThumbnail(p.doc, 128, 96);
    setThumbs(t);
  }, [userPresets]);

  const beginSave = () => {
    setName("");
    setSaving(true);
    requestAnimationFrame(() => nameRef.current?.focus());
  };
  const commitSave = () => {
    const doc = useMeshStore.getState().doc;
    saveUserPreset(doc, name || "Untitled");
    setUserPresets(loadUserPresets());
    setSaving(false);
  };
  const removePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteUserPreset(id);
    setUserPresets(loadUserPresets());
  };

  const visible =
    category === "All" ? PRESETS : PRESETS.filter((p) => p.category === category);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="z-30 shrink-0 overflow-hidden border-r border-glass-border bg-glass backdrop-blur-2xl lg:h-full max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:top-12 max-lg:shadow-panel"
          aria-label="Preset browser"
        >
          <div className="flex h-full w-[min(82vw,15rem)] flex-col lg:w-60">
            <header className="flex items-center justify-between gap-2 border-b border-glass-border px-4 py-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Presets
              </h2>
              {saving ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={nameRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitSave();
                      if (e.key === "Escape") setSaving(false);
                    }}
                    placeholder="Name…"
                    aria-label="Preset name"
                    className="h-7 w-24 rounded-md border border-glass-border bg-glass-soft px-2 text-[12px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  />
                  <button
                    type="button"
                    onClick={commitSave}
                    aria-label="Save preset"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <CheckIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaving(false)}
                    aria-label="Cancel"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={beginSave}
                  aria-label="Save current design as preset"
                  title="Save preset"
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-faint outline-none transition-colors hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Save
                </button>
              )}
            </header>

            {/* User's own saved designs — pinned above the curated library. */}
            {userPresets.length > 0 && (
              <div className="studio-scroll border-b border-glass-border p-3 pb-2">
                <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Your presets
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {userPresets.map((preset, i) => (
                    <motion.button
                      key={preset.id}
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.25 }}
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => applyPreset(preset.doc)}
                      className={cn(
                        "group relative h-20 cursor-pointer overflow-hidden rounded-lg border border-glass-border shadow-sm outline-none transition-shadow hover:shadow-lift",
                        "focus-visible:ring-2 focus-visible:ring-focus"
                      )}
                      aria-label={`Apply your preset ${preset.name}`}
                      title={preset.name}
                    >
                      {thumbs[preset.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbs[preset.id]}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <span className="absolute inset-0 animate-pulse bg-glass-soft" />
                      )}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-2 pb-1 pt-3 text-left text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {preset.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => removePreset(e, preset.id)}
                        aria-label={`Delete preset ${preset.name}`}
                        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-white opacity-0 outline-none transition-opacity hover:bg-black/70 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-focus group-hover:opacity-100"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div className="studio-scroll flex shrink-0 gap-1 overflow-x-auto border-b border-glass-border px-3 py-2">
              {(["All", ...PRESET_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-focus",
                    c === category
                      ? "bg-ink text-ink-invert"
                      : "text-faint hover:bg-hover hover:text-ink"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="studio-scroll grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto overscroll-contain p-3">
              {visible.map((preset, i) => (
                <motion.button
                  key={preset.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.25 }}
                  whileHover={{ y: -2, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => applyPreset(preset.doc)}
                  className={cn(
                    "group relative h-20 cursor-pointer overflow-hidden rounded-lg border border-glass-border shadow-sm outline-none transition-shadow hover:shadow-lift",
                    "focus-visible:ring-2 focus-visible:ring-focus"
                  )}
                  aria-label={`Apply preset ${preset.name}`}
                  title={`${preset.name} · ${preset.category}`}
                >
                  {thumbs[preset.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbs[preset.id]}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <span className="absolute inset-0 animate-pulse bg-glass-soft" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-2 pb-1 pt-3 text-left text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {preset.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
