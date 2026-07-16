"use client";

/**
 * The studio shell: top toolbar, preset rail (left), workspace with the
 * centered artboard + playback pill, inspector (right), and dialogs.
 * The WebGL artboard loads client-only with a soft placeholder.
 */

import { useEffect } from "react";
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
import { PRESETS } from "@/lib/presets";

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
  const syncThemeFromDom = useUiStore((s) => s.syncThemeFromDom);

  useEffect(() => {
    syncThemeFromDom();

    // Apply Glass Mosaic as the default design on first load.
    const glassMosaic = PRESETS.find((p) => p.name === "Glass Mosaic");
    if (glassMosaic) {
      useMeshStore.getState().applyDoc(glassMosaic.doc);
    }

    // Honor reduced motion: start paused (pressing play still works —
    // user-initiated motion is fine under prefers-reduced-motion).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      useMeshStore.getState().updateAnimation({ playing: false });
    }
  }, [syncThemeFromDom]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-dvh flex-col overflow-hidden bg-workspace font-sans text-ink">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <PresetsRail />
        <main
          className="relative min-w-0 flex-1"
          onPointerDown={(e) => {
            // Clicking empty workspace deselects.
            if (e.target === e.currentTarget) useMeshStore.getState().selectNode(null);
          }}
        >
          <Artboard />
          <PlaybackBar />
          <p className="absolute bottom-5 left-5 hidden text-[10px] text-faint lg:block">
            zoxilsi studio — mesh gradients, rendered in WebGL · © 2026
          </p>
        </main>
        <Inspector />
      </div>
      <ExportDialog />
      <ShortcutsDialog />
      <SupportDialog />
    </div>
    </MotionConfig>
  );
}
