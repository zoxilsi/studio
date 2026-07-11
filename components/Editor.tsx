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
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";

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
            Mesha — mesh gradients, rendered in WebGL · © 2026 · Designed &amp;
            created by{" "}
            <a
              href="https://x.com/zoxilsi"
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto font-medium text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              zoxilsi
            </a>
          </p>
        </main>
        <Inspector />
      </div>
      <ExportDialog />
      <ShortcutsDialog />
    </div>
    </MotionConfig>
  );
}
