"use client";

/**
 * Top chrome: wordmark, centered tool cluster (Move / Add Line), and
 * history / panel / theme / export actions.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";
import { Kbd } from "@/components/ui/Kbd";
import {
  DownloadIcon,
  GridIcon,
  MoonIcon,
  PlusIcon,
  PointsIcon,
  RedoIcon,
  SlidersIcon,
  SunIcon,
  UndoIcon,
  ChevronIcon,
} from "@/components/ui/icons";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";

function MoveTool() {
  const [scope, animateEl] = useAnimate();

  // Imperative animations always play — no mount/reduced-motion edge cases
  // can swallow the feedback.
  const onClick = () => {
    animateEl(
      "[data-move-icon]",
      { rotate: [0, -22, 16, 0], scale: [1, 1.45, 1.15, 1] },
      { duration: 0.55, ease: [0.32, 0.72, 0, 1] }
    );
    animateEl(
      "[data-move-ring]",
      { scale: [1, 1.9], opacity: [0.85, 0] },
      { duration: 0.6, ease: "easeOut" }
    );
    animateEl(
      "[data-move-btn]",
      { scale: [1, 0.92, 1.06, 1] },
      { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
    );
  };

  return (
    <span ref={scope} className="relative inline-flex">
      <span
        data-move-ring
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full border-2 border-ink/60 opacity-0"
      />
      <span data-move-btn className="inline-flex">
        <Button size="sm" active title="Move (V)" aria-label="Move tool, active" onClick={onClick}>
          <span data-move-icon className="flex">
            <PointsIcon />
          </span>
          Move
        </Button>
      </span>
    </span>
  );
}

function AddLineMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const addLine = useMeshStore((s) => s.addLine);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button size="sm" active={open} onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
        <PlusIcon />
        Add Line
        <ChevronIcon className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            role="menu"
            className="absolute left-1/2 top-full z-50 mt-2 w-48 -translate-x-1/2 rounded-xl border border-glass-border bg-glass p-1 shadow-panel backdrop-blur-2xl"
          >
            {(
              [
                { label: "Vertical line", hint: "A", o: "vertical" },
                { label: "Horizontal line", hint: "⇧A", o: "horizontal" },
              ] as const
            ).map((item) => (
              <button
                key={item.o}
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted outline-none transition-colors hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
                onClick={() => {
                  addLine(item.o);
                  setOpen(false);
                }}
              >
                {item.label}
                <Kbd>{item.hint}</Kbd>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TopBar() {
  const canUndo = useMeshStore((s) => s.past.length > 0);
  const canRedo = useMeshStore((s) => s.future.length > 0);
  const undo = useMeshStore((s) => s.undo);
  const redo = useMeshStore((s) => s.redo);

  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const presetsOpen = useUiStore((s) => s.presetsOpen);
  const togglePresets = useUiStore((s) => s.togglePresets);
  const inspectorOpen = useUiStore((s) => s.inspectorOpen);
  const toggleInspector = useUiStore((s) => s.toggleInspector);
  const setExportOpen = useUiStore((s) => s.setExportOpen);

  return (
    <header className="relative z-40 flex h-12 shrink-0 items-center justify-between border-b border-glass-border bg-glass px-3 backdrop-blur-2xl backdrop-saturate-150">
      <div className="flex items-center gap-2.5">
        <span className="studio-orb h-5 w-5 rounded-full shadow-lift" aria-hidden />
        <span className="text-[14px] font-semibold tracking-tight text-ink">zoxilsi studio</span>
        <span className="hidden text-[11px] text-faint lg:inline">Mesh gradient studio</span>
      </div>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1" role="toolbar" aria-label="Tools">
        <MoveTool />
        <AddLineMenu />
      </div>

      <nav className="flex items-center gap-1" aria-label="Editor actions">
        <Button size="icon" aria-label="Undo" title="Undo (⌘Z)" disabled={!canUndo} onClick={undo}>
          <UndoIcon />
        </Button>
        <Button size="icon" aria-label="Redo" title="Redo (⌘⇧Z)" disabled={!canRedo} onClick={redo}>
          <RedoIcon />
        </Button>

        <span className="mx-1.5 h-5 w-px bg-glass-border" aria-hidden />

        <Button size="icon" aria-label="Toggle presets" title="Presets (P)" active={presetsOpen} onClick={togglePresets}>
          <GridIcon />
        </Button>
        <Button size="icon" aria-label="Toggle inspector" title="Inspector (I)" active={inspectorOpen} onClick={toggleInspector}>
          <SlidersIcon />
        </Button>

        <span className="mx-1.5 h-5 w-px bg-glass-border" aria-hidden />

        <Button
          size="icon"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title="Theme (T)"
          onClick={toggleTheme}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="flex"
            >
              {theme === "dark" ? <MoonIcon /> : <SunIcon />}
            </motion.span>
          </AnimatePresence>
        </Button>

        <span className="mx-1.5 hidden h-5 w-px bg-glass-border sm:block" aria-hidden />

        <Magnetic>
          <Button variant="primary" size="sm" aria-label="Open export dialog" title="Export (E)" onClick={() => setExportOpen(true)}>
            <DownloadIcon />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </Magnetic>
      </nav>
    </header>
  );
}
