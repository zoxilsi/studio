"use client";

/**
 * The studio shell: top toolbar, preset rail (left), workspace with the
 * centered artboard + playback pill, inspector (right), and dialogs.
 * The WebGL artboard loads client-only with a soft placeholder.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MotionConfig } from "framer-motion";
import { TopBar } from "@/components/layout/TopBar";
import { PlaybackBar } from "@/components/layout/PlaybackBar";
import { Inspector } from "@/components/panels/Inspector";
import { PresetsRail } from "@/components/panels/PresetsRail";
import { ExportDialog } from "@/components/dialogs/ExportDialog";
import { ShortcutsDialog } from "@/components/dialogs/ShortcutsDialog";
import { SupportDialog } from "@/components/dialogs/SupportDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";
import { MobileHeader, MobileNavigation, MobilePanel } from "@/components/layout/MobileTools";
import { ProjectAutosave, ProjectLibrary } from "@/components/projects/ProjectLibrary";

const Artboard = dynamic(
  () => import("@/components/canvas/Artboard").then((m) => m.Artboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="aspect-[4/3] w-2/3 max-w-2xl animate-pulse rounded-lg bg-glass-soft ring-1 ring-glass-border" />
      </div>
    ),
  }
);

export function Editor() {
  useKeyboardShortcuts();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const mobileTool = useUiStore(s => s.mobileTool);
  const preview = useUiStore(s => s.preview);
  const syncThemeFromDom = useUiStore((s) => s.syncThemeFromDom);

  useEffect(() => {
    syncThemeFromDom();

    // On compact screens the side panels are drawers — start with a clear canvas.
    if (window.matchMedia("(max-width: 1279px)").matches) {
      useUiStore.setState({ presetsOpen: false, inspectorOpen: false, showHandles: false });
    }

    // Honor reduced motion: start paused (pressing play still works —
    // user-initiated motion is fine under prefers-reduced-motion).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      useMeshStore.getState().updateAnimation({ playing: false });
    }
  }, [syncThemeFromDom]);

  return (
    <MotionConfig reducedMotion="user">
    <div className={`studio-shell flex h-dvh flex-col overflow-hidden bg-workspace font-sans text-ink ${mobileTool ? "has-tool" : ""} ${preview ? "is-preview" : ""}`}>
      <ProjectAutosave/>
      <MobileHeader onProjects={()=>setProjectsOpen(true)}/>
      <div className="desktop-header"><TopBar /><button className="desktop-projects" onClick={()=>setProjectsOpen(true)}>Projects</button></div>

      <div className="studio-workspace relative flex min-h-0 flex-1">
        <div className="desktop-panel flex"><PresetsRail /></div>
        <main
          className="relative min-w-0 flex-1"
          onPointerDown={(e) => {
            // Clicking empty workspace deselects.
            if (e.target === e.currentTarget) useMeshStore.getState().selectNode(null);
          }}
        >
          <Artboard />
          {!preview && <PlaybackBar />}
          <p className="absolute bottom-5 left-5 hidden text-[10px] text-faint lg:block">
            JLK Wallpaper Studio · Powered by zoxilsi
          </p>
        </main>
        <div className="desktop-panel flex"><Inspector /></div>
        <MobilePanel/>


      </div>
      <MobileNavigation/>
      <ProjectLibrary open={projectsOpen} onClose={()=>setProjectsOpen(false)}/>
      <ExportDialog />
      <ShortcutsDialog />
      <SupportDialog />
    </div>
    </MotionConfig>
  );
}
