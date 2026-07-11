/**
 * Ephemeral UI state: theme, panel visibility, dialogs.
 * Theme is mirrored onto <html class="dark"> and localStorage; an inline
 * script in the root layout applies the stored theme before hydration so
 * there is never a flash of the wrong mode.
 */

import { create } from "zustand";

export type Theme = "dark" | "light";

interface UiStore {
  theme: Theme;
  inspectorOpen: boolean;
  presetsOpen: boolean;
  exportOpen: boolean;
  shortcutsOpen: boolean;
  showHandles: boolean;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleInspector: () => void;
  togglePresets: () => void;
  setExportOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  toggleHandles: () => void;
  syncThemeFromDom: () => void;
}

function applyThemeToDom(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem("zoxilsi-theme", theme);
  } catch {
    // Storage unavailable (private mode) — theme just won't persist.
  }
}

export const useUiStore = create<UiStore>((set, get) => ({
  theme: "dark",
  inspectorOpen: true,
  presetsOpen: true,
  exportOpen: false,
  shortcutsOpen: false,
  showHandles: true,

  setTheme: (theme) => {
    applyThemeToDom(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  togglePresets: () => set((s) => ({ presetsOpen: !s.presetsOpen })),
  setExportOpen: (open) => set({ exportOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  toggleHandles: () => set((s) => ({ showHandles: !s.showHandles })),

  /** Adopt whatever the pre-hydration script applied to <html>. */
  syncThemeFromDom: () => {
    if (typeof document === "undefined") return;
    const theme: Theme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    set({ theme });
  },
}));
