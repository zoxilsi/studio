"use client";

/**
 * The preset rail — a fixed sidebar of live-rendered thumbnails.
 * Thumbnails are rasterized from each preset's actual mesh (2D canvas,
 * no extra WebGL contexts) after mount.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PRESETS, PRESET_CATEGORIES } from "@/lib/presets";
import { renderThumbnail } from "@/lib/mesh";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";
import type { PresetCategory } from "@/types/gradient";
import { cn } from "@/lib/utils";

export function PresetsRail() {
  const open = useUiStore((s) => s.presetsOpen);
  const applyDoc = useMeshStore((s) => s.applyDoc);
  const [category, setCategory] = useState<PresetCategory | "All">("All");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    // Rasterize lazily after mount so SSR/hydration stay clean.
    const t: Record<string, string> = {};
    for (const p of PRESETS) t[p.id] = renderThumbnail(p.doc, 128, 96);
    setThumbs(t);
  }, []);

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
          className="z-30 h-full shrink-0 overflow-hidden border-r border-glass-border bg-glass backdrop-blur-2xl max-md:absolute max-md:left-0 max-md:top-0"
          aria-label="Preset browser"
        >
          <div className="flex h-full w-60 flex-col">
            <header className="border-b border-glass-border px-4 py-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Presets
              </h2>
            </header>

            <div className="mesha-scroll flex shrink-0 gap-1 overflow-x-auto border-b border-glass-border px-3 py-2">
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

            <div className="mesha-scroll grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto overscroll-contain p-3">
              {visible.map((preset, i) => (
                <motion.button
                  key={preset.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.25 }}
                  whileHover={{ y: -2, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => applyDoc(preset.doc)}
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
