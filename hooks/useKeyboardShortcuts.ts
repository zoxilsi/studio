"use client";

/**
 * Global keyboard map. Inputs are exempt; mesh points implement their
 * own arrow-key nudging on focus.
 */

import { useEffect } from "react";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      const mesh = useMeshStore.getState();
      const ui = useUiStore.getState();
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) mesh.redo();
        else mesh.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        mesh.redo();
        return;
      }
      if (mod || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case " ":
          if (tag === "BUTTON") return;
          e.preventDefault();
          mesh.updateAnimation({ playing: !mesh.doc.animation.playing });
          break;
        case "a":
          mesh.addLine(e.shiftKey ? "horizontal" : "vertical");
          break;
        case "r":
          mesh.randomize();
          break;
        case "h":
          ui.toggleHandles();
          break;
        case "p":
          ui.togglePresets();
          break;
        case "i":
          ui.toggleInspector();
          break;
        case "e":
          ui.setExportOpen(true);
          break;
        case "t":
          ui.toggleTheme();
          break;
        case "?":
          ui.setShortcutsOpen(true);
          break;
        case "escape":
          mesh.selectNode(null);
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
